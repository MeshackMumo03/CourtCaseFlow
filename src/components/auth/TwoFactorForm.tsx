'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { authClient } from '@/lib/auth-client';

export function TwoFactorForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice });
    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error.status === 429 ? 'Too many attempts. Please wait a minute.' : 'That code is not valid.',
      });
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Two-factor authentication</CardTitle>
        <CardDescription>
          {useBackup ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{useBackup ? 'Backup code' : 'Authentication code'}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode={useBackup ? 'text' : 'numeric'}
              maxLength={useBackup ? 32 : 6}
              autoFocus
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="trust" checked={trustDevice} onCheckedChange={setTrustDevice} />
            <Label htmlFor="trust" className="font-normal">Trust this device for 30 days</Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-primary hover:underline"
            onClick={() => {
              setUseBackup((b) => !b);
              setCode('');
            }}
          >
            {useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
