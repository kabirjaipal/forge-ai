'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authClient, useSession, signIn, signUp, signOut } from './auth-client';
import { api } from './api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  workspaces?: Workspace[];
}

interface AuthContextType {
  user: User | null;
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image || undefined,
      }
    : null;

  useEffect(() => {
    if (user?.id) {
      setIsLoadingWorkspaces(true);
      api.get<Workspace[]>('/workspaces').then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setCurrentWorkspace(res.data[0]);
        }
        setIsLoadingWorkspaces(false);
      }).catch(() => {
        setIsLoadingWorkspaces(false);
      });
    } else {
      setCurrentWorkspace(null);
    }
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        return { success: false, error: res.error.message || 'Login failed' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const res = await signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
      });

      if (res.error) {
        return { success: false, error: res.error.message || 'Registration failed' };
      }

      // Auto-create default workspace via API
      await api.post('/workspaces', {
        name: `${name || email.split('@')[0]}'s Workspace`,
        slug: `ws-${Date.now().toString(36)}`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    signOut();
    setCurrentWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentWorkspace,
        isLoading: isPending || isLoadingWorkspaces,
        login,
        register,
        logout,
        setCurrentWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
