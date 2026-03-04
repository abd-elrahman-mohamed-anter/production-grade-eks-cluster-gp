// src/lib/queryClient.ts
import { QueryClient, QueryFunction, QueryFunctionContext } from "@tanstack/react-query";

// Helper: throw if response is not ok
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get Authorization headers
function getAuthHeaders(): Headers {
  const headers = new Headers();
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

// Generic API request
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const headers = getAuthHeaders();
  if (data) headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return (await res.json()) as T;
}

// Shorthand functions for CRUD operations
export const apiGet = <T = any>(url: string) => apiRequest<T>("GET", url);
export const apiPost = <T = any>(url: string, data?: unknown) => apiRequest<T>("POST", url, data);
export const apiPatch = <T = any>(url: string, data?: unknown) => apiRequest<T>("PATCH", url, data);
export const apiDelete = <T = any>(url: string) => apiRequest<T>("DELETE", url);

// Behavior for 401 Unauthorized responses
type UnauthorizedBehavior = "returnNull" | "throw";

// Query function generator with proper generic
export const getQueryFn = <T>(
  options: { on401: UnauthorizedBehavior }
): QueryFunction<T> => async (context: QueryFunctionContext) => {
  const headers = getAuthHeaders();
  const url = context.queryKey.join("/");

  const res = await fetch(url, { credentials: "include", headers });

  if (options.on401 === "returnNull" && res.status === 401) {
    return null as unknown as T;
  }

  await throwIfResNotOk(res);
  return (await res.json()) as T;
};

// React Query client setup
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
