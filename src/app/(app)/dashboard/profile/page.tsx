
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCircle, Edit3, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const { userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
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
  
  const handleSaveProfile = async () => {
    if (!userProfile) return;
    setIsSaving(true);
    // In a real app, you would call a server action to update the user's profile
    // e.g., in Firebase Auth and Firestore.
    // await updateUserProfileAction({ uid: userProfile.uid, displayName });
    console.log('Saving profile with new display name:', displayName);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

    // Optimistically update context and local state
    setUserProfile(prev => prev ? {...prev, displayName } : null);
    
    setIsSaving(false);
    setIsEditing(false);
    // Show toast message for success
  };


  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={userProfile.photoURL || `https://placehold.co/100x100.png?text=${getInitials(userProfile.displayName)}`} alt={userProfile.displayName || "User"} data-ai-hint="profile photo"/>
            <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{isEditing ? 'Edit Profile' : userProfile.displayName}</CardTitle>
          <CardDescription className="capitalize">{userProfile.role}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={userProfile.email || ''} readOnly disabled className="bg-muted/50"/>
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
              <Button variant="outline" onClick={() => { setIsEditing(false); setDisplayName(userProfile.displayName || '');}} disabled={isSaving}>
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
    </div>
  );
}
