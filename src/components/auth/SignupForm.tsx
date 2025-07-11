
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile } from "firebase/auth";
import { Eye, EyeOff, Loader2, Phone, Building, MapPin, NotebookText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { createUserProfileInFirestore } from "@/actions/auth";
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

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid phone number').min(10, {message: "Phone number must be at least 10 digits."}),
  role: z.enum(["lawyer", "client"], { required_error: "You need to select a role." }),
  // Lawyer specific fields
  lawFirmName: z.string().optional(),
  lawFirmAddress: z.string().optional(),
  lskRegistrationNumber: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.role === 'lawyer') {
        if (!data.lskRegistrationNumber || data.lskRegistrationNumber.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "LSK Registration Number is required for lawyers.",
                path: ["lskRegistrationNumber"],
            });
        }
        if (!data.lawFirmName || data.lawFirmName.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Law Firm Name is required for lawyers.",
                path: ["lawFirmName"],
            });
        }
        if (!data.lawFirmAddress || data.lawFirmAddress.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Law Firm Address is required for lawyers.",
                path: ["lawFirmAddress"],
            });
        }
    }
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>Enter your details to get started with CourtCaseFlow.</CardDescription>
      </CardHeader>
      <CardContent>
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
           
            <Button type="submit" className="w-full" disabled={loading}>
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
