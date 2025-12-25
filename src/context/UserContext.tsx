'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '@/actions/auth';

export type UserRole = 'super-admin' | 'admin' | 'reviewer';

interface UserContextType {
  role: UserRole | null;
  user: any | null; // Adding user object
  isAdmin: boolean;
  isReviewer: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
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
    const loadRole = async () => {
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
        setRole(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadRole();
  }, []);

  const value: UserContextType = {
    role,
    user,
    isAdmin: role === 'admin' || role === 'super-admin',
    isSuperAdmin: role === 'super-admin',
    isReviewer: role === 'reviewer',
    isLoading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
