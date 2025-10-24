// services/articles/interfaces.ts
import { RowDataPacket } from "mysql2";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: "admin" | "editor" | "viewer";
}

export interface TagObject {
  id: number;
  name: string;
}

export interface CreateArticleBody {
  title: string;
  content: string;
  category_id?: number | null;
  tags?: string[];
  page?: string;
  limit?: string;
}

export interface UpdateArticleBody extends Partial<CreateArticleBody> {}

export interface Article {
  id: number;
  title: string;
  content: string;
  category_id?: number | null;
  category_name?: string;
  tags: string[];
  author: string;
  author_id?: number;
  created_by?: string;
  updated_by?: string;
  is_active: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ArticleRow extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  category_id: number | null;
  is_active: number;
  author_id: number;
  created_at: Date;
  updated_at: Date;
  author: string;
  created_by_name: string;
  updated_by_name: string;
  author_name?: string;
  category_name?: string;
  created_by?: number;
  updated_by?: number;
}

export interface CountRow extends RowDataPacket {
  total: number;
}

export interface TagRow extends RowDataPacket {
  article_id: number;
  name: string;
  id?: number;
}

export interface SearchParams {
  queryString?: string;
  categoryId?: number;
  tags?: string[];
  authorId?: number;
  pageNumber: number;
  pageSize: number;
}

export interface UserRow extends RowDataPacket {
  created_by_name: string;
  updated_by_name: string;
}
