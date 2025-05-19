import { Briefcase } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 text-primary ${className}`}>
      <Briefcase className="h-7 w-7" />
      <span className="text-2xl font-bold">CaseLink</span>
    </Link>
  );
}
