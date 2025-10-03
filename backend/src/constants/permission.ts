// src/constants/permissions.ts

// 定义不同角色能做的操作
export const PERMISSIONS = {
  admin: ["create", "read", "update", "delete", "invite"], // 管理员能做所有事
  editor: ["create", "read", "update", "delete"], // 编辑者能CRUD
  viewer: ["read"], // 观众只能看
} as const;

// 可选：定义一个类型方便在 TS 里用
export type Role = keyof typeof PERMISSIONS; // "admin" | "editor" | "viewer"
export type Action = (typeof PERMISSIONS)[Role][number];
