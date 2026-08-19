const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If running on a remote VPS IP or domain, automatically connect to port 8080 or configured API URL
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:8080/api/v1`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  meta: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("erp_access_token");
  }

  public setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("erp_access_token", token);
    }
  }

  public setRefreshToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("erp_refresh_token", token);
    }
  }

  public clearTokens() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("erp_access_token");
      localStorage.removeItem("erp_refresh_token");
      localStorage.removeItem("erp_user");
    }
  }

  async request<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...customConfig } = options;

    let url = `${getBaseUrl()}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(customConfig.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...customConfig,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If 401 Unauthorized, redirect to login
        if (response.status === 401 && typeof window !== "undefined") {
          if (!window.location.pathname.includes("/login")) {
            this.clearTokens();
            window.location.href = "/login";
          }
        }

        const errorMessage = data.message || (typeof data.error === "string" ? data.error : "Request failed");
        throw new Error(errorMessage);
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      throw err;
    }
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();
