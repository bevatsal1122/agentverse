import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { useRouter } from 'next/router';

interface AuthContextType {
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { login: privyLogin } = useLogin();
  const { logout: privyLogout } = useLogout();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const login = async () => {
    setIsLoading(true);
    try {
      await privyLogin();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await privyLogout();
      router.push('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ready && authenticated) {
      setIsLoading(false);
    }
  }, [ready, authenticated]);

  const value = {
    ready,
    authenticated,
    user,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
