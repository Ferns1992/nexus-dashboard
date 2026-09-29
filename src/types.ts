export type Role = "admin" | "editor" | "viewer";

export interface Session {
  id: number;
  username: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Link {
  id: number;
  title: string;
  url: string;
  icon: string;
  category_id: number | null;
  is_favorite: number;
  sort_order: number;
  category_name: string | null;
  category_color: string | null;
}

export interface ManagedUser {
  id: number;
  username: string;
  role: Role;
}

export interface UploadFile {
  name: string;
  size: number;
  modified: string;
  inUse: boolean;
}

export const CAN_EDIT: Role[] = ["admin", "editor"];
