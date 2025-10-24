import type { Request } from "express";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  password?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}
export interface ElasticsearchTag {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SearchTagsResult = SearchResponse<ElasticsearchTag>;

export interface Article {
  id: number;
  title: string;
  content: string;
  category_id: number;
  created_by: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface LogRecord extends RowDataPacket {
  type: "article" | "tag" | "category";
  id: number;
  target_id: number;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "RESTORE";
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
}

export interface SearchResponse<T> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: T[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DatabaseError extends Error {
  code?: string;
  message: string;
}
export interface EnrollRequest {
  username: string;
  password: string;
  role: string;
  email: string;
}

export interface EnrollResponse {
  message: string;
  user: Omit<User, "password">;
  access_token: string;
  refreshToken: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
}

export type ValidRole = "admin" | "editor" | "viewer";
export const ACCESS_SECRET = process.env.JWT_SECRET as string;
export const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });
}
