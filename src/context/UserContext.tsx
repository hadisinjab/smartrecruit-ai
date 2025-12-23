'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '@/actions/auth';

export type UserRole = 'super-admin' | 'admin' | 'reviewer';

interface UserContextType {
  role: UserRole;
  isAdmin: boolean;
  isReviewer: boolean;
  isSuperAdmin: boolean;
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
  const [role, setRole] = useState<UserRole>('reviewer');

  useEffect(() => {
    const loadRole = async () => {
      try {
        const user = await getCurrentUser();
        const userRole = user?.role;
        if (userRole === 'super-admin' || userRole === 'admin' || userRole === 'reviewer') {
          setRole(userRole);
        } else {
          setRole('reviewer');
        }
      } catch {
        setRole('reviewer');
      }
    };
    loadRole();
  }, []);

  const value: UserContextType = {
    role,
    isAdmin: role === 'admin' || role === 'super-admin',
    isSuperAdmin: role === 'super-admin',
    isReviewer: role === 'reviewer',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
