'use client';

import { Loader2, LogOut, Palette, ShieldAlert, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import QRCode from 'react-qr-code';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { authClient } from '@/lib/auth-client';

/** Re-render when the <html> "dark" class changes. */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function errorText(error: { status?: number; code?: string; message?: string }) {
  if (error.code === 'INVALID_PASSWORD') return 'The password you entered is incorrect.';
  if (error.code === 'PASSWORD_COMPROMISED') return 'This password has appeared in a data breach. Choose a different one.';
  if (error.status === 429) return 'Too many attempts. Please wait a minute.';
  return error.message ?? 'Something went wrong.';
}

export function SettingsPanel({ hasPassword, twoFactorEnabled }: { hasPassword: boolean; twoFactorEnabled: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const fail = (title: string, e: Parameters<typeof errorText>[0]) => toast({ variant: 'destructive', title, description: errorText(e) });

  /* Theme */
  const dark = useSyncExternalStore(subscribeToTheme, () => document.documentElement.classList.contains('dark'), () => false);
  function toggleDark(on: boolean) {
    document.documentElement.classList.toggle('dark', on);
    localStorage.setItem('theme', on ? 'dark' : 'light');
  }

  /* Password */
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  async function changePassword() {
    if (next !== confirm) return toast({ variant: 'destructive', title: 'Passwords do not match.' });
    if (next.length < 10) return toast({ variant: 'destructive', title: 'New password must be at least 10 characters.' });
    setPwBusy(true);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setPwBusy(false);
    if (error) return fail('Update failed', error);
    toast({ title: 'Password updated', description: 'Other devices have been signed out.' });
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  /* Two-factor */
  const [tfOpen, setTfOpen] = useState(false);
  const [tfPassword, setTfPassword] = useState('');
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [tfCode, setTfCode] = useState('');
  const [tfBusy, setTfBusy] = useState(false);

  function resetTwoFactor() {
    setTfPassword('');
    setTotpURI(null);
    setBackupCodes([]);
    setTfCode('');
  }

  async function startEnable() {
    setTfBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password: tfPassword, method: 'totp' });
    setTfBusy(false);
    if (error) return fail('Could not start setup', error);
    if (data.method !== 'totp') return;
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
  }

  async function confirmEnable() {
    setTfBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: tfCode.trim() });
    setTfBusy(false);
    if (error) return fail('Invalid code', error);
    toast({ title: 'Two-factor authentication enabled' });
    setTfOpen(false);
    resetTwoFactor();
    router.refresh();
  }

  async function disable() {
    setTfBusy(true);
    const { error } = await authClient.twoFactor.disable({ password: tfPassword });
    setTfBusy(false);
    if (error) return fail('Could not disable', error);
    toast({ title: 'Two-factor authentication disabled' });
    setTfOpen(false);
    resetTwoFactor();
    router.refresh();
  }

  /* Sessions */
  async function signOutOthers() {
    const { error } = await authClient.revokeOtherSessions();
    if (error) return fail('Could not sign out other devices', error);
    toast({ title: 'Signed out of all other devices' });
  }

  /* Delete account */
  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  async function deleteAccount() {
    setDelBusy(true);
    const { error } = await authClient.deleteUser(hasPassword ? { password: delPassword } : {});
    setDelBusy(false);
    if (error) return fail('Deletion failed', error);
    toast({ title: 'Account deleted' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Saved in this browser.</p>
            </div>
            <Switch id="dark-mode" checked={dark} onCheckedChange={toggleDark} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasPassword ? (
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Change Password</h4>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <PasswordInput id="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={pwBusy} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput id="new-password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={pwBusy} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={pwBusy} />
              </div>
              <Button onClick={changePassword} disabled={pwBusy || !current || !next || !confirm}>
                {pwBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              You sign in with Google, so there&apos;s no password to change. Use &quot;Forgot password&quot; on the login page to add one.
            </p>
          )}

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Two-Factor Authentication</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              {twoFactorEnabled ? 'On. You need a code from your authenticator app to sign in.' : 'Require a code from an authenticator app when you sign in.'}
            </p>
            <Dialog
              open={tfOpen}
              onOpenChange={(o) => {
                setTfOpen(o);
                if (!o) resetTwoFactor();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!hasPassword}>
                  {twoFactorEnabled ? 'Disable 2FA' : 'Set up 2FA'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{twoFactorEnabled ? 'Disable two-factor authentication' : 'Set up two-factor authentication'}</DialogTitle>
                  <DialogDescription>
                    {totpURI ? 'Scan the QR code with your authenticator app, save your backup codes, then enter a code to finish.' : 'Confirm your password to continue.'}
                  </DialogDescription>
                </DialogHeader>

                {!totpURI ? (
                  <div className="space-y-2 py-2">
                    <Label htmlFor="tf-password">Password</Label>
                    <PasswordInput id="tf-password" value={tfPassword} onChange={(e) => setTfPassword(e.target.value)} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="rounded-md bg-white p-3">
                      <QRCode value={totpURI} size={180} />
                    </div>
                    <div className="w-full">
                      <p className="mb-1 text-sm font-medium">Backup codes (each works once; store them somewhere safe):</p>
                      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-2 font-mono text-sm">
                        {backupCodes.map((c) => (
                          <span key={c}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      <Label htmlFor="tf-code">6-digit code</Label>
                      <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={tfCode} onChange={(e) => setTfCode(e.target.value)} />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setTfOpen(false)}>
                    Cancel
                  </Button>
                  {twoFactorEnabled ? (
                    <Button variant="destructive" onClick={disable} disabled={tfBusy || !tfPassword}>
                      {tfBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Disable
                    </Button>
                  ) : totpURI ? (
                    <Button onClick={confirmEnable} disabled={tfBusy || tfCode.trim().length !== 6}>
                      {tfBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify &amp; Enable
                    </Button>
                  ) : (
                    <Button onClick={startEnable} disabled={tfBusy || !tfPassword}>
                      {tfBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Other Devices</h4>
            <p className="mb-3 text-sm text-muted-foreground">Sign out everywhere except this browser.</p>
            <Button variant="outline" onClick={signOutOthers}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out other devices
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>Deleting your account is permanent. Lawyers must first remove or transfer their cases.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={delOpen} onOpenChange={setDelOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete My Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>This cannot be undone. Your account and your messages will be permanently deleted.</DialogDescription>
              </DialogHeader>
              {hasPassword && (
                <div className="space-y-2 py-4">
                  <Label htmlFor="delete-password">Password</Label>
                  <PasswordInput id="delete-password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDelOpen(false)} disabled={delBusy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={deleteAccount} disabled={delBusy || (hasPassword && !delPassword)}>
                  {delBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
