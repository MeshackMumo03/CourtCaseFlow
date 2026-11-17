'use client';

import { Briefcase, CalendarDays, Home, LogOut, Menu, PlusCircle, Settings, ShieldQuestion, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/Logo';
import { UserNav } from '@/components/layout/UserNav';
import type { ShellUser } from '@/components/layout/types';
import { useLogout } from '@/components/layout/useLogout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

// Navigation only hides links; every page also checks the role on the server.
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['lawyer', 'client', 'admin'] },
  { href: '/cases/create', label: 'New Case', icon: PlusCircle, roles: ['lawyer'] },
  { href: '/cases', label: 'All Cases', icon: Briefcase, roles: ['lawyer'] },
  { href: '/hearings', label: 'Hearings', icon: CalendarDays, roles: ['lawyer', 'client'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['lawyer'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['lawyer', 'client', 'admin'] },
  { href: '/admin/verifications', label: 'Admin Verifications', icon: ShieldQuestion, roles: ['admin'] },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  const items = navItems.filter((item) => item.roles.includes(user.role));

  const sidebar = (
    <>
      <div className="px-4 py-6">
        <Logo />
      </div>
      <ScrollArea className="flex-1 px-2">
        <nav className="grid items-start gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent/50 hover:text-primary',
                pathname === item.href && 'bg-accent font-semibold text-primary',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="mt-auto border-t p-4">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="mr-2 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:flex md:flex-col">{sidebar}</div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Toggle navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <UserNav user={user} />
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-auto bg-background p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
