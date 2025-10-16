import React, { useEffect, useState } from "react";
import type { User } from "./CommonTypes";
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";
import "../styles/Dashboard.css";
import Sidebar from "./Sidebar";

interface DashboardProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Category {
  id: number;
  name: string;
  is_active?: number;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Tag {
  id: number;
  name: string;
  is_active?: number;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
) {
  // 确保每次请求都带 cookie
  const opts: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
  };

  // 发请求
  let res = await fetch(input, opts);

  // 如果 401 -> 尝试刷新 token（refresh endpoint 会 set-cookie）
  if (res.status === 401) {
    console.log("Access token expired — attempting refresh...");
    const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!refreshRes.ok) {
      // 刷新失败：跳转登录或处理登出
      console.error("Refresh failed, redirecting to login");
      throw new Error("Refresh failed");
    }

    // 刷新成功（后端已 set-cookie 新的 accessToken）
    // 重新发原请求一次
    res = await fetch(input, opts);
  }

  return res;
}

// 🔥 获取当前登录用户（通过 cookie）
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/protected`, {
      credentials: "include",
    });

    if (!res.ok) {
      console.log("User not authenticated");
      return null;
    }

    const data = await res.json();
    return data.data?.user || null;
  } catch (err) {
    console.error("❌ Failed to fetch current user:", err);
    return null;
  }
}

const fetchStats = async () => {
  try {
    let totalArticles = 0;
    let page = 1;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE_URL}/articles?page=${page}&limit=${limit}`;
      const res = await fetchWithAuth(url);
      const result = await res.json();

      if (!result.success) {
        console.error("Failed to fetch articles:", result.message);
        break;
      }

      const list = Array.isArray(result.data) ? result.data : [];
      totalArticles += list.length;

      // 如果返回的数据少于 limit，说明没有更多了
      hasMore = list.length === limit;
      page++;
    }

    return {
      totalArticles,
      draftsPendingReview: 0,
      newUsersLast7Days: 0,
    };
  } catch (err) {
    console.error("❌ Failed to fetch stats:", err);
    return {
      totalArticles: 0,
      draftsPendingReview: 0,
      newUsersLast7Days: 0,
    };
  }
};

export default function Dashboard({
  currentUser,
  setCurrentUser,
}: DashboardProps) {
  const [stats, setStats] = useState({
    totalArticles: 0,
    draftsPendingReview: 0,
    newUsersLast7Days: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [catPage, setCatPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);
  const [catHasMore, setCatHasMore] = useState(true);
  const [tagHasMore, setTagHasMore] = useState(true);

  const setCategory = () => {};

  const canManage =
    currentUser && PERMISSIONS[currentUser.role].includes("edit");
  useEffect(() => {
    const initUser = async () => {
      if (!currentUser) {
        const user = await fetchCurrentUser();
        if (!user) {
          console.warn("No user, stay on page (not redirecting yet)");
          // window.location.href = "/login";
          return;
        }
        setCurrentUser(user);
      }
    };
    initUser();
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (canManage) {
      setLoading(true);
      fetchStats().then((data) => {
        setStats(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [canManage]);

  // ===== 获取分类（仅管理员） =====
  const fetchCategories = async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      setCatLoading(true);

      const url = `${API_BASE_URL}/categories?page=${pageNum}&limit=20`;

      const res = await fetchWithAuth(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message || "Failed to fetch categories."}`);
        return;
      }

      const list = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];

      if (append) {
        setCategories((prev) => [...prev, ...list]);
      } else {
        setCategories(list);
      }

      setCatHasMore(list.length === 20);
      setCatPage(pageNum);
    } catch (err) {
      console.error("Category fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setCatLoading(false);
    }
  };

  // ===== 获取标签（仅管理员） =====
  const fetchTags = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setTagLoading(true);

      const url = `${API_BASE_URL}/tags?page=${pageNum}&limit=20`;
      const res = await fetchWithAuth(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message || "Failed to fetch tags."}`);
        return;
      }

      const list = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];

      if (append) {
        setTags((prev) => [...prev, ...list]);
      } else {
        setTags(list);
      }

      setTagHasMore(list.length === 20);
      setTagPage(pageNum);
    } catch (err) {
      console.error("Tag fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setTagLoading(false);
    }
  };

  // ===== 编辑分类 =====
  const handleEditCategory = async (id: number, oldName: string) => {
    const newName = window.prompt("Enter new category name:", oldName);
    if (!newName || newName.trim() === oldName) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newName.trim() }),
      });

      const result = await res.json();

      if (result.success) {
        setMessage(`✅ Category "${newName.trim()}" updated successfully`);
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c))
        );
      } else {
        setMessage(`❌ ${result.message || "Failed to update category."}`);
      }
    } catch (err) {
      console.error("Edit category error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // ===== 删除分类 =====
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      const msg = result.message || result.error || "";

      if (!result.success && /used by/i.test(msg)) {
        const forceConfirm = window.confirm(
          "⚠️ This category is still used by some articles.\n\nIf you force delete it, all related articles will have no category.\n\nDo you want to force delete this category?"
        );

        if (forceConfirm) {
          const forceRes = await fetchWithAuth(
            `${API_BASE_URL}/categories/${id}?force=true`,
            { method: "DELETE" }
          );
          const forceResult = await forceRes.json();

          if (forceResult.success) {
            setMessage(`✅ ${forceResult.message || "Category deleted"}`);
            setCategories((prev) => prev.filter((c) => c.id !== id));
          } else {
            setMessage(`❌ ${forceResult.message || "Force delete failed"}`);
          }
          return;
        } else {
          setMessage("❎ Force delete cancelled.");
          return;
        }
      }

      if (result.success) {
        setMessage(`✅ ${msg || "Category deleted"}`);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setMessage(`❌ ${msg || "Failed to delete category."}`);
      }
    } catch (err) {
      console.error("Delete category error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // ===== 编辑标签 =====
  const handleEditTag = async (id: number, oldName: string) => {
    const newName = window.prompt("Enter new tag name:", oldName);
    if (!newName || newName.trim() === oldName) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newName.trim() }),
      });

      const result = await res.json();

      if (result.success) {
        setMessage(`✅ Tag updated to "${newName.trim()}"`);
        setTags((prev) =>
          prev.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t))
        );
      } else {
        setMessage(`❌ ${result.message || "Failed to update tag."}`);
      }
    } catch (err) {
      console.error("Edit tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // ===== 删除标签 =====
  const handleDeleteTag = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/tags/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (result.success) {
        setMessage(`✅ ${result.data || result.message || "Tag deleted."}`);
        setTags((prev) => prev.filter((t) => t.id !== id));
      } else {
        setMessage(`❌ ${result.message || "Failed to delete tag."}`);
      }
    } catch (err) {
      console.error("Delete tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchCategories(1);
      fetchTags(1);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner"></div>
        <p>Loading user information...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={setCategory}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="dashboard-page">
            <div className="access-denied-card">
              <h2>🚫 Access Denied</h2>
              <p>
                You do not have the required permissions to view the Dashboard.
              </p>
              <p className="user-role">
                Your role: <span>{currentUser.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={setCategory}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="dashboard-page">
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <p>Loading statistics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <div className="dashboard-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>Dashboard</h1>
            <p>
              Welcome back, {currentUser.username}! Here's your workspace
              overview.
            </p>
          </div>

          {/* Stats Grid */}
          <section className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <h3>Total Articles</h3>
                  <p className="stat-value">{stats.totalArticles}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <h3>Drafts Pending</h3>
                  <p className="stat-value">{stats.draftsPendingReview}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>New Users (7 Days)</h3>
                  <p className="stat-value">{stats.newUsersLast7Days}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Message Display */}
          {message && (
            <div
              className={`message ${
                message.includes("❌") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}

          {/* Admin Management Sections */}
          {currentUser.role === "admin" && (
            <div className="admin-sections">
              {/* Category Management */}
              <div className="management-card">
                <div className="card-header">
                  <h2>📂 Category Management</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchCategories(1, false)}
                    disabled={catLoading}
                  >
                    {catLoading ? "Loading..." : "🔄 Refresh"}
                  </button>
                </div>

                <div className="table-container">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Created By</th>
                        <th>Updated By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <tr key={cat.id}>
                            <td className="id-cell">#{cat.id}</td>
                            <td className="name-cell">{cat.name}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  cat.is_active ? "active" : "inactive"
                                }`}
                              >
                                {cat.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{cat.created_by_name || "-"}</td>
                            <td>{cat.updated_by_name || "-"}</td>
                            <td className="actions-cell">
                              <button
                                className="btn-edit"
                                onClick={() =>
                                  handleEditCategory(cat.id, cat.name)
                                }
                              >
                                Edit
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {catHasMore && (
                    <div className="loadmore-container">
                      <button
                        className="btn-loadmore"
                        onClick={() => fetchCategories(catPage + 1, true)}
                        disabled={catLoading}
                      >
                        {catLoading ? "Loading..." : "↓ Load More"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tag Management */}
              <div className="management-card">
                <div className="card-header">
                  <h2>🏷️ Tag Management</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchTags(1, false)}
                    disabled={tagLoading}
                  >
                    {tagLoading ? "Loading..." : "🔄 Refresh"}
                  </button>
                </div>

                <div className="table-container">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Created By</th>
                        <th>Updated By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <tr key={tag.id}>
                            <td className="id-cell">#{tag.id}</td>
                            <td className="name-cell">{tag.name}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  tag.is_active ? "active" : "inactive"
                                }`}
                              >
                                {tag.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{tag.created_by_name || "-"}</td>
                            <td>{tag.updated_by_name || "-"}</td>
                            <td className="actions-cell">
                              <button
                                className="btn-edit"
                                onClick={() => handleEditTag(tag.id, tag.name)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteTag(tag.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No tags found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {tagHasMore && (
                    <div className="loadmore-container">
                      <button
                        className="btn-loadmore"
                        onClick={() => fetchTags(tagPage + 1, true)}
                        disabled={tagLoading}
                      >
                        {tagLoading ? "Loading..." : "↓ Load More"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="activity-card">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📄</div>
                <div className="activity-content">
                  <p>
                    <strong>ABC</strong> submitted a new draft
                  </p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">✅</div>
                <div className="activity-content">
                  <p>
                    <strong>DEF</strong> approved an article
                  </p>
                  <span className="activity-time">5 hours ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📂</div>
                <div className="activity-content">
                  <p>
                    New category <strong>HR</strong> created
                  </p>
                  <span className="activity-time">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
