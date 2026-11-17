'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { authClient, signIn } from '@/lib/auth-client';
import { safeRedirectPath } from '@/lib/utils';

const formSchema = z.object({
  email: z.email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export function LoginForm({ googleEnabled, next }: { googleEnabled: boolean; next?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const redirectTo = safeRedirectPath(next);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setUnverifiedEmail(null);
    const { data, error } = await signIn.email({ ...values, callbackURL: redirectTo });
    setLoading(false);

    if (error) {
      if (error.status === 403) {
        // Better Auth has just re-sent the verification email.
        setUnverifiedEmail(values.email);
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Invalid email or password.',
      });
      return;
    }

    // When two-factor is on, the auth client redirects to /two-factor itself.
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) return;
    router.replace(redirectTo);
    router.refresh();
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: '/onboarding' });
    toast({ title: 'Verification email sent', description: 'Check your inbox for the link.' });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {googleEnabled && <GoogleButton label="Sign in with Google" callbackURL={redirectTo} />}

        {unverifiedEmail && (
          <div className="mb-4 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm" role="status">
            Please verify your email first. We&apos;ve sent a link to <strong>{unverifiedEmail}</strong>.{' '}
            <button type="button" className="font-medium text-primary hover:underline" onClick={resendVerification}>
              Resend
            </button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
