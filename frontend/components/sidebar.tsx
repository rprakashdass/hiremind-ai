"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  Briefcase,
  Video,
  User,
  History,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import React from "react";

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const NavLink = ({ href, icon: Icon, children }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-4 py-2 text-sm font-medium rounded-lg",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="mr-3 h-5 w-5" />
      <span>{children}</span>
    </Link>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="flex w-full px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground">
        {/* Placeholder to avoid layout shift */}
        <div className="mr-3 h-5 w-5" />
        <span>Toggle Theme</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex w-full px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="mr-3 h-5 w-5" />
      ) : (
        <Moon className="mr-3 h-5 w-5" />
      )}
      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
};

export default function Sidebar() {
  return (
    <div className="sticky top-0 flex h-screen w-64 flex-col border-r bg-background text-foreground">
      <div className="flex h-16 items-center justify-center border-b px-6">
        <Link href="/dashboard" className="flex items-center text-foreground">
          <div className="relative ml-3">
            <h1 className="text-2xl font-bold tracking-tight">HireMe Ai</h1>
            <div className="absolute -bottom-1 left-0 w-full h-[3px] bg-primary/80 rounded-full" />
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <NavLink href="/dashboard" icon={Home}>
          Dashboard
        </NavLink>
        <NavLink href="/ats-checker" icon={FileText}>
          ATS Checker
        </NavLink>
        {/* Section group header template */}
        {/* <div className="px-4 pt-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">
          Mock Interview
        </div> */}
        <NavLink href="/interview" icon={User}>
          Mock Interview
        </NavLink>
        <NavLink href="/career-coach" icon={MessageSquare}>
          Career Coach
        </NavLink>
        <div className="px-4 pt-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">
          History
        </div>
        <NavLink href="/report" icon={History}>
          Report
        </NavLink>
      </nav>
      <div className="border-t p-2 flex flex-col gap-2">
       <div className="flex-auto w-full">
        <ThemeToggle />
       </div>
       <div className="flex-auto w-full">
        <NavLink href="/settings" icon={Settings}>
          Settings
        </NavLink>
        </div>
      </div>
    </div>
  );
}
