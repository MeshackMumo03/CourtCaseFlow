
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCircle, Edit3, Save, Upload, Mail, Phone, Building, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { updateUserProfileDetails } from '@/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as updateFirebaseProfile, EmailAuthProvider, reauthenticateWithCredential, updateEmail as updateFirebaseAuthEmail } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase'; 
import type { UserProfile } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import * as z from 'zod';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lawFirmName, setLawFirmName] = useState('');
  const [lawFirmAddress, setLawFirmAddress] = useState('');
  const [lskRegistrationNumber, setLskRegistrationNumber] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmailChange, setCurrentPasswordForEmailChange] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setLawFirmName(userProfile.lawFirmName || '');
      setLawFirmAddress(userProfile.lawFirmAddress || '');
      setLskRegistrationNumber(userProfile.lskRegistrationNumber || '');
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

  const resetEditForm = () => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setLawFirmName(userProfile.lawFirmName || '');
      setLawFirmAddress(userProfile.lawFirmAddress || '');
      setLskRegistrationNumber(userProfile.lskRegistrationNumber || '');
      setProfilePictureFile(null);
      setProfilePicturePreview(userProfile.photoURL || null);
      setNewEmail('');
      setCurrentPasswordForEmailChange('');
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    let newPhotoURL = userProfile.photoURL; 
    const detailsToUpdate: Partial<UserProfile> = {};
    let lskStatusUpdate: UserProfile['lskVerificationStatus'] | undefined = undefined;
    let firmStatusUpdate: UserProfile['lawFirmVerificationStatus'] | undefined = undefined;


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

    if (userProfile.role === 'lawyer') {
      if (lawFirmName !== (userProfile.lawFirmName || '')) {
        detailsToUpdate.lawFirmName = lawFirmName;
        firmStatusUpdate = 'pending_review';
      }
      if (lawFirmAddress !== (userProfile.lawFirmAddress || '')) {
        detailsToUpdate.lawFirmAddress = lawFirmAddress;
        firmStatusUpdate = 'pending_review'; // Also trigger review if address changes
      }
      if (lskRegistrationNumber !== (userProfile.lskRegistrationNumber || '')) {
        detailsToUpdate.lskRegistrationNumber = lskRegistrationNumber;
        lskStatusUpdate = 'pending_review';
      }
    }
    if (lskStatusUpdate) detailsToUpdate.lskVerificationStatus = lskStatusUpdate;
    if (firmStatusUpdate) detailsToUpdate.lawFirmVerificationStatus = firmStatusUpdate;


    setIsSaving(true);

    try {
      if (profilePictureFile) {
        const filePath = `profile-pictures/${user.uid}/${profilePictureFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        await uploadBytes(fileStorageRef, profilePictureFile);
        newPhotoURL = await getDownloadURL(fileStorageRef);
        detailsToUpdate.photoURL = newPhotoURL;
      }

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
      
      if (Object.keys(detailsToUpdate).length > 0) {
        const result = await updateUserProfileDetails(user.uid, detailsToUpdate);
        if (!result.success || !result.updatedProfile) {
          throw new Error(result.message || 'Failed to update profile in database.');
        }
        // Update local context with all successful changes from Firestore
         setUserProfile(prev => {
            if (!prev) return null;
            // Firestore is the source of truth after update, so spread result.updatedProfile
            return { ...prev, ...result.updatedProfile };
         });
      } else if (Object.keys(authProfileUpdates).length > 0) {
        // If only Auth profile was updated (e.g. only display name or photoURL from a different source than Firestore)
        // Still update local context for consistency
         setUserProfile(prev => {
            if (!prev) return null;
            const updated = {...prev};
            if (authProfileUpdates.displayName) updated.displayName = authProfileUpdates.displayName;
            if (authProfileUpdates.photoURL) updated.photoURL = authProfileUpdates.photoURL;
            return updated;
         });
      }
      
      setProfilePictureFile(null); 
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

  const handleUpdateEmail = async () => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Current user email not found. Cannot change email.' });
      return;
    }
    if (!newEmail || !z.string().email().safeParse(newEmail).success) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid new email address.' });
      return;
    }
    if (!currentPasswordForEmailChange) {
      toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter your current password.' });
      return;
    }
    if (newEmail === user.email) {
      toast({ variant: 'destructive', title: 'No Change', description: 'The new email is the same as your current email.' });
      return;
    }


    setIsUpdatingEmail(true);
    try {
      // Step 1: Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmailChange);
      await reauthenticateWithCredential(user, credential);

      // Step 2: Update email in Firebase Authentication
      await updateFirebaseAuthEmail(user, newEmail);

      // Step 3: Update email in Firestore via server action
      const result = await updateUserProfileDetails(user.uid, { email: newEmail });
      if (!result.success || !result.updatedProfile) {
        // If Firestore update fails, ideally we should consider reverting the Firebase Auth email change
        // or at least strongly informing the user. For now, we'll log and notify.
        console.error('Firebase Auth email updated, but Firestore update failed for email.');
        throw new Error(result.message || 'Failed to update email in database. Auth email changed but profile database may be out of sync.');
      }

      // Step 4: Update local user profile state
      setUserProfile(prev => {
        if (!prev) return null;
        return { ...prev, email: newEmail };
      });

      toast({ title: 'Email Updated Successfully', description: 'Your email address has been changed. You may need to log in again with your new email for all services to reflect the change.' });
      setNewEmail('');
      setCurrentPasswordForEmailChange('');

    } catch (error: any)
 {
      console.error('Error updating email:', error);
      let description = 'An unexpected error occurred while updating your email.';
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
            description = 'Incorrect current password. Please try again.';
            break;
          case 'auth/requires-recent-login':
            description = 'This operation is sensitive and requires a recent login. Please log out and log back in, then try again.';
            break;
          case 'auth/email-already-in-use':
            description = 'This email address is already in use by another account.';
            break;
          case 'auth/invalid-email':
            description = 'The new email address format is not valid.';
            break;
          case 'auth/user-token-expired':
             description = 'Your session has expired. Please log out and log back in, then try again.';
            break;
          case 'auth/too-many-requests':
            description = 'Too many attempts. Please try again later.';
            break;
          default:
            description = error.message || description;
        }
      }
      toast({ variant: 'destructive', title: 'Email Update Failed', description });
    } finally {
      setIsUpdatingEmail(false);
    }
  };


  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentAvatarSrc = profilePicturePreview || userProfile.photoURL || `https://placehold.co/100x100.png?text=${getInitials(userProfile.displayName)}&txtsize=33`;

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
            <Label htmlFor="emailDisplay">Current Email Address</Label>
            <div className="relative">
              <Input id="emailDisplay" type="email" value={userProfile.email || ''} readOnly disabled className="bg-muted/50 pl-10"/>
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
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

          {userProfile.role === 'lawyer' && (
            <>
              <Separator />
              <h3 className="text-lg font-medium pt-2">Law Firm Information</h3>
              <div className="space-y-2">
                <Label htmlFor="lawFirmName">Law Firm Name</Label>
                <div className="relative">
                  {isEditing ? (
                    <Input
                      id="lawFirmName"
                      placeholder="e.g., Acme Law Group"
                      value={lawFirmName}
                      onChange={(e) => setLawFirmName(e.target.value)}
                      className="pl-10"
                    />
                  ) : (
                    <Input id="lawFirmName" value={userProfile.lawFirmName || 'Not provided'} readOnly disabled className="bg-muted/50 pl-10"/>
                  )}
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lawFirmAddress">Law Firm Address</Label>
                <div className="relative">
                {isEditing ? (
                  <Textarea
                    id="lawFirmAddress"
                    placeholder="e.g., 123 Main St, Anytown, USA"
                    value={lawFirmAddress}
                    onChange={(e) => setLawFirmAddress(e.target.value)}
                    className="pl-10"
                    rows={3}
                  />
                ) : (
                  <Textarea id="lawFirmAddress" value={userProfile.lawFirmAddress || 'Not provided'} readOnly disabled className="bg-muted/50 pl-10" rows={3}/>
                )}
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <Separator />
               <h3 className="text-lg font-medium pt-2">Professional Verification</h3>
                 <div className="space-y-2">
                    <Label htmlFor="lskRegistrationNumber">LSK Registration Number</Label>
                     {isEditing ? (
                        <Input 
                            id="lskRegistrationNumber" 
                            placeholder="e.g., LSK/YYYY/NNNNN"
                            value={lskRegistrationNumber} 
                            onChange={(e) => setLskRegistrationNumber(e.target.value)} 
                        />
                        ) : (
                        <Input id="lskRegistrationNumber" value={userProfile.lskRegistrationNumber || 'Not provided'} readOnly disabled className="bg-muted/50"/>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium">LSK Status: <span className="font-normal text-muted-foreground capitalize">{userProfile.lskVerificationStatus || 'Unverified'}</span></p>
                     <p className="text-sm font-medium">Law Firm Status: <span className="font-normal text-muted-foreground capitalize">{userProfile.lawFirmVerificationStatus || 'Unverified'}</span></p>
                </div>
            </>
          )}

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
                  resetEditForm();
                }} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving || isUpdatingEmail}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Change Email Card - Now Active */}
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
            <CardTitle>Change Email Address</CardTitle>
            <CardDescription>
                To change your email, please enter your new email address and your current password.
                You may need to log in again after the change.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input 
                    id="newEmail" 
                    type="email" 
                    placeholder="new.email@example.com" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={isUpdatingEmail || isSaving || !isEditing}
                />
            </div>
            <div>
                <Label htmlFor="currentPasswordForEmailChange">Current Password</Label>
                <Input 
                    id="currentPasswordForEmailChange" 
                    type="password" 
                    placeholder="••••••••" 
                    value={currentPasswordForEmailChange}
                    onChange={(e) => setCurrentPasswordForEmailChange(e.target.value)}
                    disabled={isUpdatingEmail || isSaving || !isEditing}
                />
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail || isSaving || !isEditing || !newEmail || !currentPasswordForEmailChange}>
                {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Email
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

