"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

import { insforge, isInsForgeConfigured } from "@/lib/insforge";

type AuthUser = {
  id: string;
  email: string;
  profile?: {
    name?: string;
  } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "ai-kubernetes-agent:access-token";

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const configError = isInsForgeConfigured()
    ? null
    : "InsForge environment variables are missing.";

  useEffect(() => {
    async function loadUser() {
      if (!isInsForgeConfigured()) {
        setIsLoaded(true);
        return;
      }

      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      setToken(savedToken);

      const { data } = await insforge.auth.getCurrentUser();
      setUser(data?.user ?? null);
      setIsLoaded(true);
    }

    loadUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoaded,
      configError,
      async signIn(email: string, password: string) {
        const { data, error } = await insforge.auth.signInWithPassword({ email, password });
        if (error || !data?.accessToken || !data.user) {
          throw new Error(error?.message ?? "Sign in failed");
        }

        window.localStorage.setItem(TOKEN_KEY, data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
      },
      async signUp(email: string, password: string) {
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
          redirectTo: window.location.origin,
        });
        if (error) {
          throw new Error(error.message ?? "Sign up failed");
        }
        if (data?.requireEmailVerification) {
          throw new Error("Account created. Please verify your email, then sign in.");
        }
        if (!data?.accessToken || !data.user) {
          throw new Error("Account created. Please sign in.");
        }

        window.localStorage.setItem(TOKEN_KEY, data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
      },
      async signOut() {
        await insforge.auth.signOut();
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [configError, isLoaded, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
