
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, SettingsIcon, Bell, Palette, ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export default function SettingsPage() {
  const { userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    if (typeof window !== 'undefined') {
        const isDark = localStorage.getItem('theme') === 'dark' || 
                       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(isDark);
        // document.documentElement.classList.toggle('dark', isDark); // Applied in RootLayout or via theme provider
    }
  }, [userProfile, authLoading, router]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  const handleDarkModeChange = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSimulatedDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    toast({
      title: "Account Deletion (Simulated)",
      description: "Full account data deletion is not yet implemented. Signing you out.",
      duration: 5000,
    });
    try {
      await auth.signOut();
      setUserProfile(null); // Clear local profile
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: 'Could not sign out after simulated deletion.' });
    }
  };


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences (UI only, no backend logic yet).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates about your cases and account activity.</p>
            </div>
            <Switch
              id="email-notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              aria-label="Toggle email notifications"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
             <div>
              <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={handleDarkModeChange}
              aria-label="Toggle dark mode"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Account Security
          </CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-medium mb-1">Change Password</h4>
            <Input id="current-password" type="password" placeholder="Current Password" disabled />
            <Input id="new-password" type="password" placeholder="New Password" disabled />
            <Input id="confirm-password" type="password" placeholder="Confirm New Password" disabled />
            <Button disabled>Update Password</Button>
            <p className="text-xs text-muted-foreground">Password change functionality is not yet implemented.</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Two-Factor Authentication (2FA)</h4>
            <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account.</p>
            <Button variant="outline" disabled>Setup 2FA</Button>
             <p className="text-xs text-muted-foreground mt-1">2FA is not yet implemented.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5"/> Danger Zone
            </CardTitle>
            <CardDescription>Manage irreversible account actions.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will simulate deleting your account
                        and sign you out. Full data wipe is not yet implemented.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSimulatedDeleteAccount}>
                        Yes, delete account (simulated)
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
                Account deletion is currently simulated (signs you out).
                Full data removal from the database is not yet implemented.
            </p>
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button disabled>Save All Settings</Button>
         <p className="text-xs text-muted-foreground ml-2 mt-1">Saving settings is not yet implemented globally.</p>
      </div>
    </div>
  );
}
