// src/constants/permissions.ts

// 权限常量
export const PERMISSIONS = {
  USER_INVITE: "user:invite",
  ARTICLE_CREATE: "article:create",
  ARTICLE_READ: "article:read",
  ARTICLE_UPDATE: "article:update",
  ARTICLE_DELETE: "article:delete",
};

// 角色 → 权限映射
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.ARTICLE_CREATE,
    PERMISSIONS.ARTICLE_READ,
    PERMISSIONS.ARTICLE_UPDATE,
    PERMISSIONS.ARTICLE_DELETE,
  ],
  editor: [
    PERMISSIONS.ARTICLE_CREATE,
    PERMISSIONS.ARTICLE_READ,
    PERMISSIONS.ARTICLE_UPDATE,
    PERMISSIONS.ARTICLE_DELETE,
  ],
  reader: [PERMISSIONS.ARTICLE_READ],
};
