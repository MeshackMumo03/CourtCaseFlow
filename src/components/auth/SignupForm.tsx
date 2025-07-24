
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Eye, EyeOff, Loader2, Phone, Building, MapPin, NotebookText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { createUserProfileInFirestore, handleGoogleSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // Client-side auth
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phoneNumber: z.string().min(10, {message: "Please enter a valid phone number."}),
  role: z.enum(["lawyer", "client"], { required_error: "You need to select a role." }),
  // Lawyer specific fields are now optional at the base level
  lawFirmName: z.string().optional(),
  lawFirmAddress: z.string().optional(),
  lskRegistrationNumber: z.string().optional(),
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUserProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      phoneNumber: "",
      role: "client",
      lawFirmName: "",
      lawFirmAddress: "",
      lskRegistrationNumber: "",
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
     // Manual validation for lawyer role
    if (values.role === 'lawyer') {
        if (!values.lskRegistrationNumber || values.lskRegistrationNumber.trim() === '') {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'LSK Registration Number is required for lawyers.' });
            setLoading(false);
            return;
        }
        if (!values.lawFirmName || values.lawFirmName.trim() === '') {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Law Firm Name is required for lawyers.' });
            setLoading(false);
            return;
        }
         if (!values.lawFirmAddress || values.lawFirmAddress.trim() === '') {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Law Firm Address is required for lawyers.' });
            setLoading(false);
            return;
        }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName: values.displayName });
      
      const profileResult = await createUserProfileInFirestore(
        firebaseUser.uid,
        values.email,
        values.displayName,
        values.role,
        values.phoneNumber || undefined,
        values.lawFirmName,
        values.lawFirmAddress,
        values.lskRegistrationNumber,
      );

      if (profileResult.success && profileResult.createdProfile) {
        setUserProfile(profileResult.createdProfile);
        toast({ title: "Signup Successful", description: "Account created. Redirecting..." });
        router.push("/dashboard");
      } else {
        console.error("Firestore profile creation failed:", profileResult.message);
        toast({
          variant: "destructive",
          title: "Signup Partially Failed",
          description: "Account created, but profile setup failed. Please contact support.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = error.message || "An unexpected error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use. Please try another one or login.";
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const actionResult = await handleGoogleSignInAction(result.user);
        if (actionResult.success && actionResult.createdProfile) {
            setUserProfile(actionResult.createdProfile);
            toast({ title: "Google Sign-In Successful", description: "Redirecting to dashboard..." });
            router.push("/dashboard");
        } else {
            throw new Error(actionResult.message);
        }
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message || "Could not sign in with Google. Please try again."
        });
    } finally {
        setGoogleLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
      <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>Enter your details to get started with CourtCaseFlow.</CardDescription>
      </CardHeader>
      <CardContent>
         <Button variant="outline" className="w-full mb-4" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Sign up with Google
        </Button>
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="client" />
                        </FormControl>
                        <FormLabel className="font-normal">Client</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="lawyer" />
                        </FormControl>
                        <FormLabel className="font-normal">Lawyer</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Input type="tel" placeholder="e.g., +1 555 123 4567" {...field} />
                        <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                     <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === 'lawyer' && (
              <div className="space-y-4 pt-4 border-t">
                 <FormField
                    control={form.control}
                    name="lskRegistrationNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>LSK Registration Number</FormLabel>
                         <FormControl>
                            <div className="relative">
                                <Input placeholder="e.g., P.105/XXXXX/YY" {...field} />
                                <NotebookText className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                         </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lawFirmName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Law Firm Name</FormLabel>
                         <FormControl>
                             <div className="relative">
                                <Input placeholder="e.g., CourtCaseFlow Associates LLP" {...field} />
                                <Building className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                         </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lawFirmAddress"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Law Firm Address</FormLabel>
                         <FormControl>
                             <div className="relative">
                                <Textarea placeholder="e.g., 123 Legal Avenue, Nairobi, Kenya" {...field} />
                                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                            </div>
                         </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                />
                <p className="text-xs text-muted-foreground">
                    Providing LSK or Law Firm details will submit them for verification by our admin team.
                </p>
              </div>
            )}
           
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <p className="text-center text-sm text-muted-foreground w-full">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
