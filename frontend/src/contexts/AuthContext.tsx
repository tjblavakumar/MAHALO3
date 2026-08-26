"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    email: string,
    password: string,
    name: string,
    role: string
  ) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if there's an existing token in sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem("mahalo3_token");
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchUser(accessToken: string) {
    const result = await api.get<User>("/auth/me");
    if (result.data) {
      setUser(result.data);
    } else {
      // Token is invalid, clear it
      sessionStorage.removeItem("mahalo3_token");
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const result = await api.post<{ access_token: string; token_type: string }>(
      "/auth/login",
      { email, password }
    );

    if (result.error) {
      return result.error;
    }

    const accessToken = result.data!.access_token;
    sessionStorage.setItem("mahalo3_token", accessToken);
    setToken(accessToken);

    // Fetch user info
    const userResult = await api.get<User>("/auth/me");
    if (userResult.data) {
      setUser(userResult.data);
    }

    return null; // no error
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: string
  ): Promise<string | null> => {
    const result = await api.post<User>("/auth/register", {
      email,
      password,
      name,
      role,
    });

    if (result.error) {
      return result.error;
    }

    return null; // no error, user can now login
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("mahalo3_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
