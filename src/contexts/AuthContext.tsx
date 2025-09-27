import React, { createContext, useContext, useEffect, useState } from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import { useRouter } from "next/router";

interface DatabaseUser {
  id: string;
  privy_id: string;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  ready: boolean;
  authenticated: boolean;
  user: any;
  databaseUser: DatabaseUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isCreatingUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { login: privyLogin } = useLogin();
  const { logout: privyLogout } = useLogout();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);

  const checkOrCreateUser = async (privyId: string, email?: string) => {
    setIsCreatingUser(true);
    try {
      const response = await fetch("/api/users/check-or-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privyId,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check or create user");
      }

      const data = await response.json();
      setDatabaseUser(data.user);
      return data;
    } catch (error) {
      console.error("Error checking or creating user:", error);
      throw error;
    } finally {
      setIsCreatingUser(false);
    }
  };

  const login = async () => {
    setIsLoading(true);
    try {
      await privyLogin();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await privyLogout();
      router.push("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ready && authenticated && user) {
      // Check or create user in database when authenticated
      checkOrCreateUser(user.id, user.email?.address)
        .then((data) => {
          console.log(
            "User database status:",
            data.isNewUser ? "Created new user" : "User exists"
          );
        })
        .catch((error) => {
          console.error("Failed to check or create user:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (ready && !authenticated) {
      setDatabaseUser(null);
      setIsLoading(false);
    }
  }, [ready, authenticated, user]);

  const value = {
    ready,
    authenticated,
    user,
    databaseUser,
    login,
    logout,
    isLoading,
    isCreatingUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
