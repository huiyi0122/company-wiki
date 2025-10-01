// src/components/CommonTypes.ts

export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface JWTPayload {
  id: number;
  username: string;
  role: Role;
  exp: number;
}

export interface DocItem {
  id?: number;
  title: string;
  content: string;
  category: string;
  author?: string;
}

// ===== 权限定义 =====
export const PERMISSIONS: Record<Role, string[]> = {
  admin: ["deleteAll", "view", "addCategory", "edit", "save"],
  editor: ["edit", "save", "deleteOwn", "view"],
  viewer: ["view"],
};

// ===== 默认分类 =====
const DEFAULT_CATEGORIES = ["HR", "Tech", "Onboarding"];

export function getCategories(): string[] {
  return DEFAULT_CATEGORIES;
}

// 假设的后端地址
export const API_BASE_URL = "http://192.168.0.17:3000";