'use client';

import { Building, Loader2, MapPin, NotebookText, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { completeOnboardingAction } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function OnboardingForm({ name }: { name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<'client' | 'lawyer'>('client');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lskRegistrationNumber, setLsk] = useState('');
  const [lawFirmName, setFirmName] = useState('');
  const [lawFirmAddress, setFirmAddress] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await completeOnboardingAction(
      role === 'lawyer'
        ? { role, phoneNumber, lskRegistrationNumber, lawFirmName, lawFirmAddress }
        : { role, phoneNumber },
    );
    setLoading(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save', description: result.message });
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome, {name}</CardTitle>
        <CardDescription>Tell us how you&apos;ll use CourtCaseFlow. This can&apos;t be changed later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>I am a...</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as 'client' | 'lawyer')} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="client" id="role-client" />
                <Label htmlFor="role-client" className="font-normal">Client</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lawyer" id="role-lawyer" />
                <Label htmlFor="role-lawyer" className="font-normal">Lawyer</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Input id="phone" type="tel" autoComplete="tel" placeholder="e.g., +254 700 123456" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
              <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {role === 'lawyer' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="lsk">LSK Registration Number</Label>
                <div className="relative">
                  <Input id="lsk" placeholder="e.g., P.105/XXXXX/YY" value={lskRegistrationNumber} onChange={(e) => setLsk(e.target.value)} required />
                  <NotebookText className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firm">Law Firm Name</Label>
                <div className="relative">
                  <Input id="firm" placeholder="e.g., Mwangi & Associates LLP" value={lawFirmName} onChange={(e) => setFirmName(e.target.value)} required />
                  <Building className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Law Firm Address</Label>
                <div className="relative">
                  <Textarea id="address" placeholder="e.g., 123 Legal Avenue, Nairobi, Kenya" value={lawFirmAddress} onChange={(e) => setFirmAddress(e.target.value)} required />
                  <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Your LSK and law firm details will be reviewed by an administrator.</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
