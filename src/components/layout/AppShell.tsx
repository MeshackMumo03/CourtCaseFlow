"use client";

import { Logo } from "@/components/Logo";
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Briefcase, FileText, Home, LogOut, Menu, PlusCircle, Settings, Users, ShieldCheck, CalendarDays } from "lucide-react";
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
  roles: Array<'lawyer' | 'client'>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ['lawyer', 'client'] },
  { href: "/cases/create", label: "New Case", icon: PlusCircle, roles: ['lawyer'] },
  { href: "/cases", label: "All Cases", icon: Briefcase, roles: ['lawyer'] }, // Clients see assigned cases on dashboard
  // { href: "/documents", label: "Documents", icon: FileText, roles: ['lawyer', 'client'] }, // maybe integrated into cases
  { href: "/hearings", label: "Hearings", icon: CalendarDays, roles: ['lawyer', 'client'] },
  { href: "/clients", label: "Clients", icon: Users, roles: ['lawyer'], disabled: true }, // Example of future item
  { href: "/settings", label: "Settings", icon: Settings, roles: ['lawyer', 'client'], disabled: true },
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || !userProfile) {
    // This should ideally not be reached if useEffect redirect works, but as a fallback.
    return null; 
  }

  const accessibleNavItems = navItems.filter(item => item.roles.includes(userProfile.role) && !item.disabled);

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
        <main className="flex-1 flex-col gap-4 p-4 lg:p-6 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
