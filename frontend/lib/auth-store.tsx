"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api-client";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  roles?: { id: string; code: string; name: string }[];
}

interface AuthContextType {
  user: UserProfile | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session on page load
    const savedUser = localStorage.getItem("erp_user");
    const savedRoles = localStorage.getItem("erp_roles");
    const savedPerms = localStorage.getItem("erp_permissions");
    const token = localStorage.getItem("erp_access_token");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedRoles) setRoles(JSON.parse(savedRoles));
        if (savedPerms) setPermissions(JSON.parse(savedPerms));
      } catch (e) {
        api.clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<any>("/auth/login", { email, password });
      if (res.data) {
        const { access_token, refresh_token, user: userData, roles: userRoles, permissions: userPerms } = res.data;
        api.setToken(access_token);
        api.setRefreshToken(refresh_token);

        localStorage.setItem("erp_user", JSON.stringify(userData));
        localStorage.setItem("erp_roles", JSON.stringify(userRoles || []));
        localStorage.setItem("erp_permissions", JSON.stringify(userPerms || []));

        setUser(userData);
        setRoles(userRoles || []);
        setPermissions(userPerms || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("erp_refresh_token");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch (e) {
        // Continue clearing even if server logout fails
      }
    }
    api.clearTokens();
    setUser(null);
    setRoles([]);
    setPermissions([]);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const hasPermission = (perm: string) => {
    if (!perm) return true;
    if (roles.includes("SUPER_ADMIN")) return true;

    // Direct granular DB permission matching
    if (permissions.includes(perm) || permissions.includes("*")) return true;

    // Role-based domain matching
    const isInventory = roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes("INVENTORY") || u.includes("GUDANG");
    });
    const isPurchasing = roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes("PURCHASING") || u.includes("PEMBELIAN") || u.includes("BUYER");
    });
    const isSales = roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes("SALES") || u.includes("PENJUALAN") || u.includes("MARKETING");
    });
    const isFinance = roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes("FINANCE") || u.includes("KEUANGAN") || u.includes("ACCOUNTING") || u.includes("AKUNTAN");
    });
    const isHR = roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes("HR") || u.includes("SDM") || u.includes("PAYROLL") || u.includes("PERSONALIA");
    });

    if (isInventory && perm.startsWith("inventory:")) return true;
    if (isPurchasing && (perm.startsWith("purchasing:") || perm === "inventory:products:read")) return true;
    if (isSales && (perm.startsWith("sales:") || perm === "inventory:products:read")) return true;
    if (isFinance && (perm.startsWith("finance:") || perm === "sales:invoices:read")) return true;
    if (isHR && perm.startsWith("hr:")) return true;

    return false;
  };

  const hasRole = (role: string) => {
    if (roles.includes("SUPER_ADMIN")) return true;
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
