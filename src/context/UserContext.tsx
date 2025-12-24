'use client';

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'super-admin' | 'admin' | 'reviewer';

interface UserContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
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
  // Default role is admin
  const [role, setRole] = useState<UserRole>('admin');

  const value = {
    role,
    setRole,
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
