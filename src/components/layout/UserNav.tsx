"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { LogOut, User as UserIcon, Settings, Briefcase, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserNav() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out." });
    }
  };

  if (!user || !userProfile) {
    return null; // Or a login button if preferred in this state
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const roleIcon = userProfile.role === 'lawyer' ? <Briefcase className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png?text=${getInitials(userProfile.displayName)}`} alt={userProfile.displayName || "User"} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile"> {/* Assuming a profile page */}
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
           <DropdownMenuItem>
              {roleIcon}
              <span className="capitalize">{userProfile.role}</span>
            </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings"> {/* Assuming a settings page */}
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
