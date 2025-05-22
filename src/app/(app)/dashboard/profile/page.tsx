
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Edit3, Save, Upload, Mail, Phone, Building, MapPin, UserCircle } from 'lucide-react'; // Added UserCircle
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { updateUserProfileDetails } from '@/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as updateFirebaseProfile, EmailAuthProvider, reauthenticateWithCredential, updateEmail as updateFirebaseAuthEmail } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase'; 
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

  const populateFormFields = useCallback((profile: UserProfile | null) => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setLawFirmName(profile.lawFirmName || '');
      setLawFirmAddress(profile.lawFirmAddress || '');
      setLskRegistrationNumber(profile.lskRegistrationNumber || '');
      setProfilePicturePreview(profile.photoURL || null);
      setNewEmail(profile.email || ''); // Initialize newEmail with current email
    }
  }, []);


  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    if (userProfile) {
      populateFormFields(userProfile);
    }
  }, [userProfile, authLoading, router, populateFormFields]);

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
      populateFormFields(userProfile); // Use the central populating function
      setProfilePictureFile(null); // Clear file selection
      // profilePicturePreview is already reset by populateFormFields
      setCurrentPasswordForEmailChange(''); // Clear password field
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    // Create a snapshot of the current state for comparison
    const initialProfileState = {
      displayName: userProfile.displayName || '',
      phoneNumber: userProfile.phoneNumber || '',
      lawFirmName: userProfile.lawFirmName || '',
      lawFirmAddress: userProfile.lawFirmAddress || '',
      lskRegistrationNumber: userProfile.lskRegistrationNumber || '',
      photoURL: userProfile.photoURL || null,
    };
    
    const detailsToUpdate: Partial<UserProfile> = {};
    let lskStatusUpdate: UserProfile['lskVerificationStatus'] | undefined = undefined;
    let firmStatusUpdate: UserProfile['lawFirmVerificationStatus'] | undefined = undefined;


    if (phoneNumber !== initialProfileState.phoneNumber) {
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number.'});
            return;
        }
        detailsToUpdate.phoneNumber = phoneNumber;
    }
    
    if (displayName !== initialProfileState.displayName) {
        if (displayName.length < 2) {
             toast({ variant: 'destructive', title: 'Invalid Display Name', description: 'Display name must be at least 2 characters.'});
            return;
        }
        detailsToUpdate.displayName = displayName;
    }

    if (userProfile.role === 'lawyer') {
      if (lawFirmName !== initialProfileState.lawFirmName) {
        detailsToUpdate.lawFirmName = lawFirmName;
        firmStatusUpdate = 'pending_review';
      }
      if (lawFirmAddress !== initialProfileState.lawFirmAddress) {
        detailsToUpdate.lawFirmAddress = lawFirmAddress;
        firmStatusUpdate = 'pending_review';
      }
      if (lskRegistrationNumber !== initialProfileState.lskRegistrationNumber) {
        detailsToUpdate.lskRegistrationNumber = lskRegistrationNumber;
        if(lskRegistrationNumber) { // Only trigger review if a number is provided
            lskStatusUpdate = 'pending_review';
        } else { // If cleared, revert to unverified
            lskStatusUpdate = 'unverified';
        }
      }
    }
    if (lskStatusUpdate) detailsToUpdate.lskVerificationStatus = lskStatusUpdate;
    if (firmStatusUpdate) detailsToUpdate.lawFirmVerificationStatus = firmStatusUpdate;

    setIsSaving(true);

    try {
      let newPhotoURL = profilePicturePreview; // Start with current preview or existing URL
      if (profilePictureFile) {
        const filePath = `profile-pictures/${user.uid}/${profilePictureFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        await uploadBytes(fileStorageRef, profilePictureFile);
        newPhotoURL = await getDownloadURL(fileStorageRef);
        detailsToUpdate.photoURL = newPhotoURL;
      } else if (profilePicturePreview !== initialProfileState.photoURL) {
        // This case covers if the preview was cleared or changed without a new file (e.g. to default)
        // Though typically clearing would mean setting photoURL to null/undefined in detailsToUpdate
        // For now, if profilePictureFile is null, photoURL changes are handled if detailsToUpdate.photoURL is set
      }


      const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
      if (detailsToUpdate.displayName && detailsToUpdate.displayName !== user.displayName) {
        authProfileUpdates.displayName = detailsToUpdate.displayName;
      }
      // Use the potentially updated newPhotoURL for Firebase Auth profile
      if (detailsToUpdate.photoURL && detailsToUpdate.photoURL !== user.photoURL) {
        authProfileUpdates.photoURL = detailsToUpdate.photoURL;
      } else if (newPhotoURL !== user.photoURL && !detailsToUpdate.photoURL && profilePictureFile) {
        // If photoURL was updated via profilePictureFile but not explicitly in detailsToUpdate yet
        authProfileUpdates.photoURL = newPhotoURL;
      }


      if (Object.keys(authProfileUpdates).length > 0) {
        await updateFirebaseProfile(user, authProfileUpdates);
      }
      
      if (Object.keys(detailsToUpdate).length > 0) {
        const result = await updateUserProfileDetails(user.uid, detailsToUpdate);
        if (!result.success || !result.updatedProfile) {
          throw new Error(result.message || 'Failed to update profile in database.');
        }
        setUserProfile(prev => prev ? { ...prev, ...result.updatedProfile } : null);
      } else if (Object.keys(authProfileUpdates).length > 0) {
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
      toast({ variant: 'default', title: 'No Change', description: 'The new email is the same as your current email.' });
      return;
    }


    setIsUpdatingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmailChange);
      await reauthenticateWithCredential(user, credential);
      await updateFirebaseAuthEmail(user, newEmail); // Update Firebase Auth email

      const result = await updateUserProfileDetails(user.uid, { email: newEmail }); // Update Firestore email
      if (!result.success || !result.updatedProfile) {
        console.error('Firebase Auth email updated, but Firestore update failed for email.');
        throw new Error(result.message || 'Failed to update email in database. Auth email changed but profile database may be out of sync.');
      }

      setUserProfile(prev => prev ? { ...prev, email: newEmail, ...result.updatedProfile } : null);
      toast({ title: 'Email Updated Successfully', description: 'Your email address has been changed. You may need to log in again with your new email.' });
      setCurrentPasswordForEmailChange(''); // Clear password field

    } catch (error: any) {
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
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }
  
  const currentAvatarSrc = profilePicturePreview || `https://placehold.co/100x100.png?text=${getInitials(userProfile.displayName)}&txtsize=33`;


  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
         {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
      </div>
     
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
            disabled={!isEditing || isSaving}
          />
          <CardTitle className="text-2xl">{isEditing ? 'Edit Profile Details' : userProfile.displayName}</CardTitle>
          <CardDescription className="capitalize flex items-center gap-1">
            <UserCircle className="h-4 w-4 text-muted-foreground" /> {userProfile.role}
          </CardDescription>
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
                disabled={isSaving}
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
                    placeholder="e.g., +254 700 123456"
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="pl-10"
                    disabled={isSaving}
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
                      placeholder="e.g., CaseLink Associates LLP"
                      value={lawFirmName}
                      onChange={(e) => setLawFirmName(e.target.value)}
                      className="pl-10"
                      disabled={isSaving}
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
                    placeholder="e.g., 123 Legal Avenue, Nairobi, Kenya"
                    value={lawFirmAddress}
                    onChange={(e) => setLawFirmAddress(e.target.value)}
                    className="pl-10"
                    rows={3}
                    disabled={isSaving}
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
                            placeholder="e.g., P.105/XXXXX/YY"
                            value={lskRegistrationNumber} 
                            onChange={(e) => setLskRegistrationNumber(e.target.value)} 
                            disabled={isSaving}
                        />
                        ) : (
                        <Input id="lskRegistrationNumber" value={userProfile.lskRegistrationNumber || 'Not provided'} readOnly disabled className="bg-muted/50"/>
                    )}
                </div>
                <div className="space-y-1 text-sm">
                    <p>LSK Status: <Badge variant={userProfile.lskVerificationStatus === 'verified' ? 'default' : userProfile.lskVerificationStatus === 'pending_review' ? 'secondary' : userProfile.lskVerificationStatus === 'rejected' ? 'destructive': 'outline'} className="capitalize">{userProfile.lskVerificationStatus?.replace('_', ' ') || 'Unverified'}</Badge></p>
                    <p>Firm Status: <Badge variant={userProfile.lawFirmVerificationStatus === 'verified' ? 'default' : userProfile.lawFirmVerificationStatus === 'pending_review' ? 'secondary' : userProfile.lawFirmVerificationStatus === 'rejected' ? 'destructive' : 'outline'} className="capitalize">{userProfile.lawFirmVerificationStatus?.replace('_', ' ') || 'Unverified'}</Badge></p>
                </div>
                 {(userProfile.lskVerificationStatus === 'pending_review' || userProfile.lawFirmVerificationStatus === 'pending_review') && isEditing && (
                    <p className="text-xs text-muted-foreground">Changes to LSK number or law firm details will reset verification status to 'Pending Review'.</p>
                )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {isEditing && ( // Only show Save/Cancel when editing
            <>
              <Button variant="outline" onClick={() => { 
                  setIsEditing(false); 
                  resetEditForm();
                }} disabled={isSaving || isUpdatingEmail}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving || isUpdatingEmail}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {isEditing && ( // Show email change form only when main profile editing is active
        <Card className="max-w-2xl mx-auto mt-6">
            <CardHeader>
                <CardTitle>Change Email Address</CardTitle>
                <CardDescription>
                    To change your email, enter your new email and current password. You may need to log in again after the change.
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
                        disabled={isUpdatingEmail || isSaving}
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
                        disabled={isUpdatingEmail || isSaving}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail || isSaving || !newEmail || !currentPasswordForEmailChange || newEmail === userProfile.email}>
                    {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Email
                </Button>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}

// Added useCallback to satisfy ESLint exhaustive-deps for useEffect
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
