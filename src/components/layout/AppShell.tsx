
"use client";

import { Logo } from "@/components/Logo";
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Briefcase, FileText, Home, LogOut, Menu, PlusCircle, Settings, Users, ShieldCheck, CalendarDays, ShieldQuestion, Loader2 as IconLoader } from "lucide-react"; // Renamed Loader2 to avoid conflict
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Array<'lawyer' | 'client' | 'admin'>; 
  disabled?: boolean;
  adminOnly?: boolean; 
}

const ADMIN_EMAIL = 'admin@caselink.com'; 

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ['lawyer', 'client', 'admin'] },
  { href: "/cases/create", label: "New Case", icon: PlusCircle, roles: ['lawyer'] },
  { href: "/cases", label: "All Cases", icon: Briefcase, roles: ['lawyer'] },
  { href: "/hearings", label: "Hearings", icon: CalendarDays, roles: ['lawyer', 'client'] },
  // { href: "/clients", label: "Clients", icon: Users, roles: ['lawyer'], disabled: true }, // Example of a disabled link
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ['lawyer', 'client', 'admin'] },
  { href: "/admin/verifications", label: "Admin Verifications", icon: ShieldQuestion, roles: ['admin'], adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Logged Out" });
      router.push("/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Failed" });
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <IconLoader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || !userProfile) {
    // This case should ideally be handled by the useEffect redirecting to /login
    // Adding a fallback just in case.
    return (
         <div className="flex h-screen w-screen items-center justify-center">
            <IconLoader className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-2">Redirecting...</p>
        </div>
    ); 
  }

  const isAdmin = userProfile.email === ADMIN_EMAIL;
  const currentUserRole = isAdmin ? 'admin' : userProfile.role;

  const accessibleNavItems = navItems.filter(item => 
    item.roles.includes(currentUserRole) && 
    !item.disabled &&
    (item.adminOnly ? isAdmin : true)
  );

  const SidebarContent = () => (
    <>
      <div className="px-4 py-6">
        <Logo />
      </div>
      <ScrollArea className="flex-1 px-2">
        <nav className="grid items-start gap-1">
          {accessibleNavItems.map((item) => (
            <Link key={item.label} href={item.href} legacyBehavior passHref>
              <a
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent/50",
                  pathname === item.href && "bg-accent text-primary font-semibold",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
                aria-disabled={item.disabled}
                tabIndex={item.disabled ? -1 : undefined}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="mt-auto p-4 border-t">
         <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </Button>
      </div>
    </>
  );


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:flex md:flex-col">
        <SidebarContent />
      </div>
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6 sticky top-0 z-30">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex-1">
            {/* Optional: Breadcrumbs or page title here */}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 flex flex-col gap-4 p-4 lg:p-6 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Loader2 component was removed as it was named IconLoader from lucide-react
// If you need a specific Loader2 component, it should be defined elsewhere or imported.
// For now, lucide-react's Loader2 is aliased as IconLoader to avoid naming conflicts.
