import type { Category, Link, ManagedUser, Session, UploadFile } from "../types";

const TOKEN_KEY = "nexus_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    const message =
      (payload && typeof payload.error === "string" && payload.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

const json = (body: unknown) => JSON.stringify(body);

export interface LinkInput {
  title: string;
  url: string;
  icon: string;
  category_id: number | null;
}

export interface CategoryInput {
  name: string;
  color: string;
  icon: string;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: Session }>("/api/auth/login", {
      method: "POST",
      body: json({ username, password }),
    }),

  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => request<Session>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>("/api/auth/password", {
      method: "PUT",
      body: json({ currentPassword, newPassword }),
    }),

  listUsers: () => request<ManagedUser[]>("/api/users"),

  createUser: (username: string, password: string, role: string) =>
    request<ManagedUser>("/api/users", {
      method: "POST",
      body: json({ username, password, role }),
    }),

  updateUser: (id: number, changes: { password?: string; role?: string }) =>
    request<{ success: boolean }>(`/api/users/${id}`, {
      method: "PUT",
      body: json(changes),
    }),

  deleteUser: (id: number) =>
    request<{ success: boolean }>(`/api/users/${id}`, { method: "DELETE" }),

  listCategories: () => request<Category[]>("/api/categories"),

  createCategory: (input: CategoryInput) =>
    request<Category>("/api/categories", { method: "POST", body: json(input) }),

  updateCategory: (id: number, changes: Partial<CategoryInput>) =>
    request<{ success: boolean }>(`/api/categories/${id}`, {
      method: "PUT",
      body: json(changes),
    }),

  deleteCategory: (id: number) =>
    request<{ success: boolean }>(`/api/categories/${id}`, { method: "DELETE" }),

  listLinks: () => request<Link[]>("/api/links"),

  createLink: (input: LinkInput) =>
    request<Link>("/api/links", { method: "POST", body: json(input) }),

  updateLink: (id: number, changes: Partial<LinkInput> & { is_favorite?: boolean }) =>
    request<{ success: boolean }>(`/api/links/${id}`, {
      method: "PUT",
      body: json(changes),
    }),

  deleteLink: (id: number) =>
    request<{ success: boolean }>(`/api/links/${id}`, { method: "DELETE" }),

  listUploads: () => request<UploadFile[]>("/api/uploads"),

  deleteUpload: (name: string) =>
    request<{ success: boolean }>(`/api/uploads/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/api/upload", { method: "POST", body: form });
  },
};
