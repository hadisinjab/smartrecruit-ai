'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '@/actions/auth';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'super-admin' | 'admin' | 'reviewer';

interface UserContextType {
  role: UserRole | null;
  user: any | null; // Adding user object
  isAdmin: boolean;
  isReviewer: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      setIsLoading(true);
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        const userRole = userData?.role?.trim().toLowerCase(); // Trim whitespace and normalize case
        console.log('Current User Role:', userRole); // Debug log

        if (userRole === 'super-admin' || userRole === 'admin' || userRole === 'reviewer') {
          setRole(userRole as UserRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Failed to load user role:', error);
        // If we can't resolve the current user, do NOT keep stale user/role.
        // Stale state causes "switching back" to a previous account after logout/login.
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    loadUser();

    // Keep state in sync with Supabase auth changes (login/logout/token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setIsLoading(false);
        return;
      }
      // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED
      loadUser();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    const userData = await getCurrentUser();
    setUser(userData);
    const userRole = userData?.role?.trim().toLowerCase();
    if (userRole === 'super-admin' || userRole === 'admin' || userRole === 'reviewer') {
      setRole(userRole as UserRole);
    } else {
      setRole(null);
    }
  };

  const value: UserContextType = {
    role,
    user,
    isAdmin: role === 'admin' || role === 'super-admin',
    isSuperAdmin: role === 'super-admin',
    isReviewer: role === 'reviewer',
    isLoading,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
