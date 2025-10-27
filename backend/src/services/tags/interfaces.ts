export interface User {
  id: number;
  username: string;
}

export interface Tag {
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

export interface TagLog {
  tag_id: number;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "DELETE" | "RESTORE";
  changed_by: number;
  old_data: string | null;
  new_data: string;
  changed_at?: string;
}

export interface ElasticsearchTag {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  updated_by: number;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
  data: T[];
}

export interface DatabaseConnection {
  query(sql: string, values?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface GetTagsOptions {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateTagData {
  name?: string;
  is_active?: boolean;
}
