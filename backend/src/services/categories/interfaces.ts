export interface User {
  id: number;
  username: string;
  email?: string;
  role: "admin" | "editor" | "viewer";
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryLog {
  category_id: number;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "RESTORE";
  changed_by: number;
  old_data: string | null;
  new_data: string;
  changed_at?: string;
}

export interface ElasticsearchCategory {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by?: number; // ✅ 添加
  created_by_name?: string;
  updated_by?: number; // ✅ 添加
  updated_by_name?: string;
  created_at?: string; // ✅ 添加
  updated_at?: string; // ✅ 添加
}

export interface DatabaseConnection {
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface GetCategoriesOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateCategoryData {
  name?: string;
  is_active?: boolean;
}
