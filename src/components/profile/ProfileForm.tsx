'use client';

import { Building, Edit3, Loader2, Mail, MapPin, Phone, Save, Upload, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';

import { updateProfileAction, uploadAvatarAction } from '@/actions/profile';
import { VerificationBadge } from '@/components/common/badges';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { authClient } from '@/lib/auth-client';
import { getInitials } from '@/lib/utils';
import type { Role, VerificationStatus } from '@/types';

interface Profile {
  name: string;
  email: string;
  image: string | null;
  role: Role;
  phoneNumber: string;
  lawFirmName: string;
  lawFirmAddress: string;
  lskRegistrationNumber: string;
  lskVerificationStatus: VerificationStatus;
  lawFirmVerificationStatus: VerificationStatus;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(profile);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const isLawyer = profile.role === 'lawyer';

  const set = (key: keyof Profile) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    setSaving(true);
    const result = await updateProfileAction({
      name: form.name,
      phoneNumber: form.phoneNumber,
      ...(isLawyer && {
        lawFirmName: form.lawFirmName,
        lawFirmAddress: form.lawFirmAddress,
        lskRegistrationNumber: form.lskRegistrationNumber,
      }),
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.message });
      return;
    }
    toast({ title: 'Profile updated' });
    setEditing(false);
    router.refresh();
  }

  async function onAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    const result = await uploadAvatarAction(fd);
    setUploading(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Upload failed', description: result.message });
      return;
    }
    toast({ title: 'Profile picture updated' });
    router.refresh();
  }

  async function changeEmail() {
    setChangingEmail(true);
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: '/dashboard/profile' });
    setChangingEmail(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not change email', description: error.message });
      return;
    }
    toast({ title: 'Check your inbox', description: 'Follow the link we sent to confirm the change.' });
    setNewEmail('');
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader className="items-center text-center">
          <div className="relative">
            <Avatar className="mb-4 h-24 w-24">
              {profile.image && <AvatarImage src={profile.image} alt={profile.name} />}
              <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-4 right-0 h-8 w-8 rounded-full bg-background"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Upload new profile picture"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>
          <input type="file" ref={fileRef} onChange={onAvatar} accept="image/png,image/jpeg" className="hidden" />
          <CardTitle className="text-2xl">{profile.name}</CardTitle>
          <CardDescription className="flex items-center gap-1 capitalize">
            <UserCircle className="h-4 w-4" /> {profile.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Input id="email" value={profile.email} readOnly disabled className="bg-muted/50 pl-10" />
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" value={form.name} onChange={set('name')} disabled={!editing || saving} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Input id="phone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} disabled={!editing || saving} className="pl-10" />
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {isLawyer && (
            <>
              <Separator />
              <h3 className="pt-2 text-lg font-medium">Law Firm &amp; Verification</h3>
              <div className="space-y-2">
                <Label htmlFor="firm">Law Firm Name</Label>
                <div className="relative">
                  <Input id="firm" value={form.lawFirmName} onChange={set('lawFirmName')} disabled={!editing || saving} className="pl-10" />
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Law Firm Address</Label>
                <div className="relative">
                  <Textarea id="address" value={form.lawFirmAddress} onChange={set('lawFirmAddress')} disabled={!editing || saving} className="pl-10" rows={3} />
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lsk">LSK Registration Number</Label>
                <Input id="lsk" value={form.lskRegistrationNumber} onChange={set('lskRegistrationNumber')} disabled={!editing || saving} />
              </div>
              {editing && <p className="text-xs text-muted-foreground">Changing LSK or firm details sends them back for admin review.</p>}
              <div className="flex flex-wrap gap-2">
                <VerificationBadge label="LSK" status={profile.lskVerificationStatus} />
                <VerificationBadge label="Firm" status={profile.lawFirmVerificationStatus} />
              </div>
            </>
          )}
        </CardContent>
        {editing && (
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setForm(profile);
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Change Email Address</CardTitle>
          <CardDescription>We&apos;ll email your current address to approve the change, then verify the new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="newEmail">New Email Address</Label>
          <Input id="newEmail" type="email" placeholder="new.email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </CardContent>
        <CardFooter>
          <Button onClick={changeEmail} disabled={changingEmail || !newEmail || newEmail === profile.email}>
            {changingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Email
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
