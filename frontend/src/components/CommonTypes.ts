export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  username: string;
  email?: string; // ✅ 改为可选
  role: Role;
}

// export interface JWTPayload {
//   id: number;
//   username: string;
//   role: Role;
//   exp: number;
// }

// ✅ 改进后的 DocItem：包含后端常见字段
export interface DocItem {
  id?: number;
  title: string;
  content: string;
  category_id: number;
  category?: string; // 后端 JOIN category 时的名称
  author_id?: number;
  author?: string;
  author_name?:string;
  created_by_name?: string;
  create_at?: string;
  created_at?: string;
  updated_at?: string;


  // ✅ 支持标签显示
  tags?: { id: number; name: string }[];
  tag_ids?: number[];

  // ✅ 可选字段扩展
  summary?: string;
  views?: number;
}

// ===== 权限定义 =====
export const PERMISSIONS: Record<Role, string[]> = {
  admin: ["edit"],
  editor: ["edit"],
  viewer: [],
};


// 后端地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn("⚠️ The VITE_API_BASE_URL environment variable is not set. Please check your .env file! Use the default value /api");
}
