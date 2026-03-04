import { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { apiRequest, queryClient } from "./queryClient";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });
  const [isLoading, setIsLoading] = useState(true);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
      setTokenState(newToken);
    } else {
      localStorage.removeItem("token");
      setTokenState(null);
    }
  };

  const checkAuth = async () => {
    try {
      // Attempt to validate session with server using cookies (httpOnly) or
      // Authorization header if the client stored a token. Always call /api/auth/me
      // so cookie-based sessions are respected.
      const storedToken = localStorage.getItem("token");

      const headers: Record<string, string> = {};
      if (storedToken) headers["Authorization"] = `Bearer ${storedToken}`;

      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // If server returned a token in JSON, save it for API header usage (optional)
        if (data.token) {
          localStorage.setItem("token", data.token);
          setTokenState(data.token);
        }
      } else {
        // Not authenticated
        localStorage.removeItem("token");
        setUser(null);
        setTokenState(null);
      }
    } catch (error) {
      console.error("Failed to check authentication", error);
      localStorage.removeItem("token");
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // include credentials so server can clear httpOnly cookies
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", headers });
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setTokenState(null);
      queryClient.clear(); // Clear React Query cache on logout
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
  isAuthenticated: !!user,
        logout,
        refreshAuth,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
