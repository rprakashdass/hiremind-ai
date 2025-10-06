'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { fetchCurrentUser, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app load
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
