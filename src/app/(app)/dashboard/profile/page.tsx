
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCircle, Edit3, Save, Upload, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { updateUserProfileDetails } from '@/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as updateFirebaseProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase'; // Ensure storage is exported from firebase
import type { UserProfile } from '@/types';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setProfilePicturePreview(userProfile.photoURL || null);
    }
  }, [userProfile, authLoading, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    let newPhotoURL = userProfile.photoURL; // Keep existing if not changed
    const detailsToUpdate: Partial<UserProfile> = {};

    // Validate phone number if changed
    if (phoneNumber !== (userProfile.phoneNumber || '')) {
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number.'});
            return;
        }
        detailsToUpdate.phoneNumber = phoneNumber;
    }
    
    if (displayName !== (userProfile.displayName || '')) {
        if (displayName.length < 2) {
             toast({ variant: 'destructive', title: 'Invalid Display Name', description: 'Display name must be at least 2 characters.'});
            return;
        }
        detailsToUpdate.displayName = displayName;
    }


    setIsSaving(true);

    try {
      // 1. Upload new profile picture if selected
      if (profilePictureFile) {
        const filePath = `profile-pictures/${user.uid}/${profilePictureFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        await uploadBytes(fileStorageRef, profilePictureFile);
        newPhotoURL = await getDownloadURL(fileStorageRef);
        detailsToUpdate.photoURL = newPhotoURL;
      }

      // 2. Update Firebase Auth profile (displayName and photoURL)
      // Only update if there's a change to avoid unnecessary calls
      const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
      if (detailsToUpdate.displayName && detailsToUpdate.displayName !== user.displayName) {
        authProfileUpdates.displayName = detailsToUpdate.displayName;
      }
      if (detailsToUpdate.photoURL && detailsToUpdate.photoURL !== user.photoURL) {
        authProfileUpdates.photoURL = detailsToUpdate.photoURL;
      }

      if (Object.keys(authProfileUpdates).length > 0) {
        await updateFirebaseProfile(user, authProfileUpdates);
      }
      
      // 3. Update Firestore profile (displayName, phoneNumber, photoURL)
      if (Object.keys(detailsToUpdate).length > 0) {
        const result = await updateUserProfileDetails(user.uid, detailsToUpdate);
        if (!result.success) {
          throw new Error(result.message || 'Failed to update profile in database.');
        }
      }

      // Optimistically update context and local state
      setUserProfile(prev => {
        if (!prev) return null;
        const updated = {...prev};
        if (detailsToUpdate.displayName !== undefined) updated.displayName = detailsToUpdate.displayName;
        if (detailsToUpdate.phoneNumber !== undefined) updated.phoneNumber = detailsToUpdate.phoneNumber;
        if (detailsToUpdate.photoURL !== undefined) updated.photoURL = detailsToUpdate.photoURL;
        return updated;
      });
      
      setProfilePictureFile(null); // Clear selected file
      setIsEditing(false);
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });

    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'An unexpected error occurred while saving your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentAvatarSrc = profilePicturePreview || userProfile.photoURL || `https://placehold.co/100x100.png?text=${getInitials(userProfile.displayName)}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="items-center text-center">
          <div className="relative group">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={currentAvatarSrc} alt={userProfile.displayName || "User"} data-ai-hint="profile avatar"/>
              <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-4 right-0 rounded-full h-8 w-8 bg-background group-hover:opacity-100 opacity-70"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload new profile picture"
              >
                <Upload className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif"
            className="hidden"
          />
          <CardTitle className="text-2xl">{isEditing ? 'Edit Profile' : userProfile.displayName}</CardTitle>
          <CardDescription className="capitalize">{userProfile.role}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Input id="email" type="email" value={userProfile.email || ''} readOnly disabled className="bg-muted/50 pl-10"/>
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {/* TODO: Add email editing functionality with re-authentication */}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            {isEditing ? (
              <Input 
                id="displayName" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
              />
            ) : (
              <Input id="displayName" value={userProfile.displayName || ''} readOnly disabled className="bg-muted/50"/>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
             <div className="relative">
                {isEditing ? (
                <Input 
                    id="phoneNumber" 
                    type="tel"
                    placeholder="e.g., +1 234 567 8900"
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="pl-10"
                />
                ) : (
                <Input id="phoneNumber" type="tel" value={userProfile.phoneNumber || 'Not provided'} readOnly disabled className="bg-muted/50 pl-10"/>
                )}
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Account Created</p>
            <p className="text-sm text-muted-foreground">
              {userProfile.createdAt?.toDate ? userProfile.createdAt.toDate().toLocaleDateString() : 'Date not available'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { 
                  setIsEditing(false); 
                  setDisplayName(userProfile.displayName || '');
                  setPhoneNumber(userProfile.phoneNumber || '');
                  setProfilePictureFile(null);
                  setProfilePicturePreview(userProfile.photoURL || null);
                }} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Placeholder for Email Editing - requires re-authentication */}
      {isEditing && (
         <Card className="max-w-2xl mx-auto mt-6">
            <CardHeader>
                <CardTitle>Change Email Address</CardTitle>
                <CardDescription>Changing your email requires re-entering your current password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="newEmail">New Email</Label>
                    <Input id="newEmail" type="email" placeholder="new.email@example.com" disabled/>
                </div>
                <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" placeholder="••••••••" disabled/>
                </div>
                 <p className="text-xs text-muted-foreground">Email change functionality is not yet fully implemented.</p>
            </CardContent>
            <CardFooter>
                <Button disabled>Update Email</Button>
            </CardFooter>
         </Card>
      )}
    </div>
  );
}
