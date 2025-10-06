"use client";

import Link from "next/link";
import {
  Briefcase,
  Moon,
  Sun,
  User,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex w-full items-center justify-center rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-muted"
    >
      {theme === "dark" ? (
        <Sun className="mr-2 h-5 w-5" />
      ) : (
        <Moon className="mr-2 h-5 w-5" />
      )}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
};

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
      >
        <User className="h-5 w-5 text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border bg-background shadow-lg">
          <div className="p-1">
            <Link
              href="/settings"
              className="flex w-full items-center rounded-md p-2 text-sm text-foreground hover:bg-muted"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
            <button className="flex w-full items-center rounded-md p-2 text-sm text-foreground hover:bg-muted">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-4">
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Upgrade
        </button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
