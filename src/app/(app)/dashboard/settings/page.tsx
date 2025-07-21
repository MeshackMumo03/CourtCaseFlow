
'use client';

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Palette, ShieldAlert, Trash2, Briefcase, CalendarClock, QrCode } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { cva } from "class-variance-authority";
import Image from "next/image";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from "firebase/auth";

export default function SettingsPage() {
  const { user, userProfile, loading: authLoading, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [hearingRemindersEnabled, setHearingRemindersEnabled] = useState(true);
  const [caseUpdatesEnabled, setCaseUpdatesEnabled] = useState(true);

  const [darkMode, setDarkMode] = useState(false);
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // State for 2FA
  const [isActivating2FA, setIsActivating2FA] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  
  // State for account deletion
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogContentOpen, setIsDeleteDialogContentOpen] = useState(false);

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

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error("User not found or email is missing.");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return user;
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
        toast({ variant: "destructive", title: "Password too short", description: "New password must be at least 6 characters." });
        return;
    }
    
    setIsUpdatingPassword(true);
    try {
      const reauthenticatedUser = await reauthenticate(currentPassword);
      await updatePassword(reauthenticatedUser, newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.code === 'auth/wrong-password' ? 'The current password you entered is incorrect.' : error.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEnable2FASimulated = async () => {
      if (twoFaCode.length !== 6) {
          toast({variant: 'destructive', title: 'Invalid Code', description: 'Please enter a 6-digit code.'});
          return;
      }
      setIsActivating2FA(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsActivating2FA(false);
      setIs2FAEnabled(true);
      setIs2FADialogOpen(false);
      setTwoFaCode("");
      toast({title: '2FA Enabled', description: 'Two-factor authentication has been successfully enabled on your account.'})
  };
  
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const reauthenticatedUser = await reauthenticate(deletePasswordConfirm);
      await deleteUser(reauthenticatedUser);
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      router.push("/login");
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: error.code === 'auth/wrong-password' ? 'The password you entered is incorrect.' : error.message });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogContentOpen(false);
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
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
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
           <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Change Password</h4>
            <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isUpdatingPassword} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isUpdatingPassword} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isUpdatingPassword} />
            </div>
            <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}>
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Two-Factor Authentication (2FA)</h4>
            <p className="text-sm text-muted-foreground mb-3">
              {is2FAEnabled ? "2FA is currently enabled on your account." : "Add an extra layer of security to your account."}
            </p>
            <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={is2FAEnabled}>
                  {is2FAEnabled ? "2FA Enabled" : "Setup 2FA"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                    <DialogDescription>Scan the QR code with your authenticator app, then enter the code below to verify.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <Image src="https://placehold.co/200x200.png" alt="QR Code" width={200} height={200} data-ai-hint="qr code"/>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Can't scan? Enter this code manually:</p>
                        <p className="font-mono text-lg tracking-widest bg-muted p-2 rounded-md">ABCD EFGH IJKL MNOP</p>
                    </div>
                     <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="2fa-code">Verification Code</Label>
                        <Input 
                            id="2fa-code" 
                            placeholder="123456" 
                            maxLength={6}
                            value={twoFaCode}
                            onChange={(e) => setTwoFaCode(e.target.value)}
                        />
                     </div>
                </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setIs2FADialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEnable2FASimulated} disabled={isActivating2FA}>
                        {isActivating2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Verify & Enable
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
             <p className="text-xs text-muted-foreground mt-1">
                {is2FAEnabled ? "Disabling 2FA is not yet implemented." : "This is a simulated 2FA setup flow."}
             </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5"/> Danger Zone
            </CardTitle>
            <CardDescription>This action is irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
            <Dialog open={isDeleteDialogContentOpen} onOpenChange={setIsDeleteDialogContentOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>Delete My Account</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove your data from our servers. To confirm, please type your password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="delete-confirm-password">Password</Label>
                        <Input
                            id="delete-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            value={deletePasswordConfirm}
                            onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogContentOpen(false)} disabled={isDeleting}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || !deletePasswordConfirm}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Account Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>

    </div>
  );
}

// Helper for buttonVariants in AlertDialogAction
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
