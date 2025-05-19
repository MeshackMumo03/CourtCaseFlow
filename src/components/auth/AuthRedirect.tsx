"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Skeleton className="h-12 w-12 rounded-full bg-primary/20" />
      <Skeleton className="mt-4 h-4 w-48 bg-primary/20" />
      <p className="mt-2 text-muted-foreground">Loading CaseLink...</p>
    </div>
  );
}
