
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, SettingsIcon, Bell, Palette, ShieldAlert } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Example state for settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false); // In a real app, this would use theme context

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.replace('/login');
    }
    // Load user preferences from backend or local storage if available
  }, [userProfile, authLoading, router]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences.</CardDescription>
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
           {/* Add more notification settings as needed */}
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
              onCheckedChange={(checked) => {
                setDarkMode(checked);
                // Implement theme switching logic here
                if (checked) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }}
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
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="current-password">Change Password</Label>
            <Input id="current-password" type="password" placeholder="Current Password" />
            <Input id="new-password" type="password" placeholder="New Password" />
            <Input id="confirm-password" type="password" placeholder="Confirm New Password" />
            <Button disabled>Update Password</Button>
            <p className="text-xs text-muted-foreground">Password change functionality is not yet implemented.</p>
          </div>
          <Separator />
           {/* Add Two-Factor Authentication setup if needed */}
          <div>
            <h4 className="font-medium mb-2">Two-Factor Authentication (2FA)</h4>
            <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account.</p>
            <Button variant="outline" disabled>Setup 2FA</Button>
             <p className="text-xs text-muted-foreground mt-1">2FA is not yet implemented.</p>
          </div>
        </CardContent>
         <CardFooter>
            <Button variant="destructive" disabled>Delete Account</Button>
             <p className="text-xs text-muted-foreground ml-2 mt-1">Account deletion is not yet implemented.</p>
        </CardFooter>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button disabled>Save All Settings</Button>
         <p className="text-xs text-muted-foreground ml-2 mt-1">Saving settings is not yet implemented.</p>
      </div>
    </div>
  );
}
