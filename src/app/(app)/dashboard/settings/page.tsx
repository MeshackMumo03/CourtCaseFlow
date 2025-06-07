
'use client';

import { Button, buttonVariants } from "@/components/ui/button"; // Ensure buttonVariants is imported if needed, or cva if buttonVariants is defined locally
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, SettingsIcon, Bell, Palette, ShieldAlert, Trash2, Briefcase, CalendarClock } from "lucide-react";
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
import { cva } from "class-variance-authority"; // Added import for cva

export default function SettingsPage() {
  const { userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [hearingRemindersEnabled, setHearingRemindersEnabled] = useState(true);
  const [caseUpdatesEnabled, setCaseUpdatesEnabled] = useState(true);

  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    
    if (typeof window !== 'undefined') {
        const isDark = localStorage.getItem('theme') === 'dark' || 
                       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(isDark);
        if (isDark) document.documentElement.classList.add('dark');

        const storedNotifSettings = localStorage.getItem('notificationSettings');
        if (storedNotifSettings) {
            try {
                const settings = JSON.parse(storedNotifSettings);
                setEmailNotificationsEnabled(settings.emailNotificationsEnabled ?? true);
                setHearingRemindersEnabled(settings.hearingRemindersEnabled ?? true);
                setCaseUpdatesEnabled(settings.caseUpdatesEnabled ?? true);
            } catch (e) {
                console.error("Failed to parse notification settings from localStorage", e);
            }
        }
    }
  }, [userProfile, authLoading, router]);

  const handleNotificationChange = (setter: React.Dispatch<React.SetStateAction<boolean>>, key: string) => (checked: boolean) => {
    setter(checked);
    // Save to localStorage for UI persistence (no backend yet)
    try {
        const currentSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        currentSettings[key] = checked;
        localStorage.setItem('notificationSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.error("Failed to save notification settings to localStorage", e);
    }
  };


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
    setIsDeleting(true);
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Account Deletion (Simulated)",
      description: "Full account data deletion is not yet implemented. Signing you out.",
      duration: 5000,
    });
    try {
      await auth.signOut();
      setUserProfile(null); 
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: 'Could not sign out after simulated deletion.' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };


  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences (UI only, settings saved in browser).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="email-notifications" className="font-medium">Master Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive general updates and account activity emails.</p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotificationsEnabled}
              onCheckedChange={handleNotificationChange(setEmailNotificationsEnabled, 'emailNotificationsEnabled')}
              aria-label="Toggle email notifications"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="hearing-reminders" className="font-medium flex items-center gap-1">
                <CalendarClock className="h-4 w-4 text-muted-foreground"/> Hearing Reminders
              </Label>
              <p className="text-sm text-muted-foreground">Get email notifications for upcoming court dates.</p>
            </div>
            <Switch
              id="hearing-reminders"
              checked={hearingRemindersEnabled}
              onCheckedChange={handleNotificationChange(setHearingRemindersEnabled, 'hearingRemindersEnabled')}
              aria-label="Toggle hearing reminder notifications"
              disabled={!emailNotificationsEnabled} 
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="case-updates" className="font-medium flex items-center gap-1">
                <Briefcase className="h-4 w-4 text-muted-foreground"/> Case Updates
              </Label>
              <p className="text-sm text-muted-foreground">Receive notifications about significant updates to your cases.</p>
            </div>
            <Switch
              id="case-updates"
              checked={caseUpdatesEnabled}
              onCheckedChange={handleNotificationChange(setCaseUpdatesEnabled, 'caseUpdatesEnabled')}
              aria-label="Toggle case update notifications"
              disabled={!emailNotificationsEnabled}
            />
          </div>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Notification preferences are for UI demonstration and saved in your browser storage.
          </p>
        </CardFooter>
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
                    <Button variant="destructive" disabled={isDeleting}>Delete Account</Button>
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
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSimulatedDeleteAccount} disabled={isDeleting} className={localButtonVariants({variant: "destructive"})}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
      
      {/* <div className="flex justify-end mt-8">
        <Button disabled>Save All Settings</Button>
         <p className="text-xs text-muted-foreground ml-2 mt-1">Saving settings is not yet implemented globally.</p>
      </div> */}
    </div>
  );
}

// Helper for buttonVariants in AlertDialogAction
// Renamed to localButtonVariants to avoid conflict if buttonVariants is also imported from ui/button
const localButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);


