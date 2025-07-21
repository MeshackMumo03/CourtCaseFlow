
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setEmailSent(true);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${values.email}, a reset link has been sent.`,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      // We don't want to reveal if an email exists or not for security reasons.
      // So we show a generic success message regardless of the outcome.
      setEmailSent(true);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${values.email}, a reset link has been sent.`,
      });
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
       <Card className="w-full">
        <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
                A password reset link has been sent to the email address you provided, if it exists in our system.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Mail className="w-16 h-16 mx-auto text-primary" />
        </CardContent>
        <CardFooter>
            <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
        <CardDescription>No problem. Enter your email and we'll send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </Form>
        </CardContent>
        <CardFooter>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                Remembered your password? Login
            </Link>
        </CardFooter>
    </Card>
  );
}
