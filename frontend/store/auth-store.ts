import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, User, LoginRequest, RegisterRequest } from '../lib/api-client';
import { toast } from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  changePassword: (passwordData: { current_password: string; new_password: string }) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const tokenResponse = await apiClient.login(credentials);
          
          // Fetch user data after successful login
          const userData = await apiClient.getCurrentUser();
          
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          toast.success('Successfully logged in!');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          
          toast.error(errorMessage);
          return false;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.register(userData);
          
          set({
            isLoading: false,
            error: null
          });
          
          toast.success('Registration successful! Please log in.');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          
          toast.error(errorMessage);
          return false;
        }
      },

      logout: () => {
        apiClient.logout();
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
        
        toast.success('Successfully logged out!');
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      },

      fetchCurrentUser: async () => {
        if (!apiClient.isAuthenticated()) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        
        try {
          const userData = await apiClient.getCurrentUser();
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          // If fetching user fails, user might be logged out or token expired
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          
          apiClient.logout();
        }
      },

      updateUser: async (userData: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const updatedUser = await apiClient.updateCurrentUser(userData);
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null
          });
          
          toast.success('Profile updated successfully!');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Update failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          
          toast.error(errorMessage);
          return false;
        }
      },

      changePassword: async (passwordData: { current_password: string; new_password: string }) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.changePassword(passwordData);
          
          set({
            isLoading: false,
            error: null
          });
          
          toast.success('Password changed successfully!');
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Password change failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          
          toast.error(errorMessage);
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'hiremind-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
