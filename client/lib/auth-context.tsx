'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn, signUp, signOut } from './auth-client';
import { api } from './api';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithProvider: (provider: 'google' | 'github') => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image || undefined,
      }
    : null;

  const fetchWorkspaces = async () => {
    setIsLoadingWorkspaces(true);
    try {
      const res = await api.get<Workspace[]>('/workspaces');
      if (res.success && res.data) {
        setWorkspaces(res.data);
        if (res.data.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(res.data[0]);
        }
      } else {
        setWorkspaces([]);
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchWorkspaces();
    } else {
      setCurrentWorkspace(null);
      setWorkspaces([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    try {
      const res = await signIn.email({ email, password });
      if (res.error) return { success: false, error: res.error.message || 'Login failed' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const loginWithProvider = async (provider: 'google' | 'github') => {
    const callbackURL = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:3000/dashboard';
    await signIn.social({
      provider,
      callbackURL,
    });
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      // Server auto-creates the workspace via databaseHooks.user.create.after
      const res = await signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
      });
      if (res.error) return { success: false, error: res.error.message || 'Registration failed' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    signOut();
    setCurrentWorkspace(null);
    setWorkspaces([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentWorkspace,
        workspaces,
        isLoading: isPending || isLoadingWorkspaces,
        login,
        loginWithProvider,
        register,
        logout,
        setCurrentWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
