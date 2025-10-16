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
  updated_at?: string;
}

// ===== 通用 fetch（自动 refresh token） =====
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem("accessToken");

  let response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        credentials: "include",
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.success && refreshData.token) {
        localStorage.setItem("accessToken", refreshData.token);

        response = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${refreshData.token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      } else {
        localStorage.removeItem("accessToken");
        return { error: "TOKEN_EXPIRED" };
      }
    } catch (err) {
      console.error("Refresh token failed:", err);
      localStorage.removeItem("accessToken");
      return { error: "TOKEN_EXPIRED" };
    }
  }

  return response;
}

// ===== Dashboard Component =====
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
  const [catPagination, setCatPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [tagPagination, setTagPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const canManage =
    currentUser && PERMISSIONS[currentUser.role]?.includes("edit");

  const setCategory = () => {};

  // ===== 获取统计数据 =====
  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/articles?limit=50`);
      if ((res as any)?.error === "TOKEN_EXPIRED") {
        setMessage("⚠️ Session expired, please login again.");
        setCurrentUser(null);
        return {
          totalArticles: 0,
          draftsPendingReview: 0,
          newUsersLast7Days: 0,
        };
      }

      const result = await (res as Response).json();
      if (!result.success) throw new Error(result.message);

      const list = Array.isArray(result.data?.data)
        ? result.data.data
        : Array.isArray(result.data)
        ? result.data
        : [];

      return {
        totalArticles: list.length,
        draftsPendingReview: 0,
        newUsersLast7Days: 0,
      };
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      return {
        totalArticles: 0,
        draftsPendingReview: 0,
        newUsersLast7Days: 0,
      };
    }
  };

  // ===== 获取分类 =====
  const fetchCategories = async (page = 1) => {
    try {
      setCatLoading(true);

      const url = `${API_BASE_URL}/categories?page=${page}&limit=${catPagination.limit}`;
      const res = await fetchWithAuth(url);
      if ((res as any)?.error === "TOKEN_EXPIRED") {
        setMessage("⚠️ Session expired, please login again.");
        setCurrentUser(null);
        return;
      }

      const result = await (res as Response).json();
      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];
      const total = result.meta?.total ?? list.length;

      setCategories(list);
      setCatPagination({
        page,
        limit: result.meta?.limit ?? 10,
        total,
      });
    } catch (err) {
      console.error("Category fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setCatLoading(false);
    }
  };

  // ===== 获取标签 =====
  const fetchTags = async (page = 1) => {
    try {
      setTagLoading(true);

      const url = `${API_BASE_URL}/tags?page=${page}&limit=${tagPagination.limit}`;
      const res = await fetchWithAuth(url);
      if ((res as any)?.error === "TOKEN_EXPIRED") {
        setMessage("⚠️ Session expired, please login again.");
        setCurrentUser(null);
        return;
      }

      const result = await (res as Response).json();
      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];
      const total = result.meta?.total ?? list.length;

      setTags(list);
      setTagPagination({
        page,
        limit: result.meta?.limit ?? 10,
        total,
      });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const result = await (res as Response).json();
      if (!result.success) {
        setMessage(`❌ ${result.message || "Failed to update category."}`);
        return;
      }
      setMessage(`✅ Category "${newName.trim()}" updated successfully`);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c))
      );
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
      const result = await (res as Response).json();
      const msg = result.message || result.error || "";

      if (!result.success && /used by/i.test(msg)) {
        const forceConfirm = window.confirm(
          "⚠️ This category is still used by some articles.\nForce delete?"
        );
        if (!forceConfirm) {
          setMessage("❎ Force delete cancelled.");
          return;
        }
        const forceRes = await fetchWithAuth(
          `${API_BASE_URL}/categories/${id}?force=true`,
          { method: "DELETE" }
        );
        const forceResult = await (forceRes as Response).json();
        if (forceResult.success) {
          setMessage(`✅ ${forceResult.message || "Category deleted"}`);
          setCategories((prev) => prev.filter((c) => c.id !== id));
        } else {
          setMessage(`❌ ${forceResult.message || "Force delete failed"}`);
        }
        return;
      }

      if (result.success) {
        setMessage(`✅ ${msg || "Category deleted"}`);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setMessage(`❌ ${msg || "Failed to delete category."}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const result = await (res as Response).json();
      if (!result.success) {
        setMessage(`❌ ${result.message || "Failed to update tag."}`);
        return;
      }
      setMessage(`✅ Tag updated to "${newName.trim()}"`);
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t))
      );
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
      const result = await (res as Response).json();
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

  // ===== useEffect 初始化 =====
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    fetchStats().then((data) => {
      setStats(data);
      setLoading(false);
    });

    if (currentUser.role === "admin") {
      fetchCategories();
      fetchTags();
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        Please login to view the dashboard.
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

  // ===== 渲染 Dashboard =====
  return (
    <div className="layout">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <div className="dashboard-page">
          <div className="page-header">
            <h1>Dashboard</h1>
            <p>
              Welcome back, {currentUser.username}! Here's your workspace overview.
            </p>
          </div>

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

          {message && (
            <div className={`message ${message.includes("❌") ? "error" : "success"}`}>
              {message}
            </div>
          )}

          {/* ===== Admin Management ===== */}
          {currentUser.role === "admin" && (
            <div className="admin-sections">
              {/* Categories Table */}
              <div className="management-card">
                <div className="card-header">
                  <h2>📂 Category Management</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchCategories(1)}
                    disabled={catLoading}
                  >
                    {catLoading ? "Refreshing..." : "🔄 Refresh"}
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
                            <td>#{cat.id}</td>
                            <td>{cat.name}</td>
                            <td>
                              <span className={cat.is_active ? "active" : "inactive"}>
                                {cat.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{cat.created_by_name || "-"}</td>
                            <td>{cat.updated_by_name || "-"}</td>
                            <td>
                              <button onClick={() => handleEditCategory(cat.id, cat.name)}>
                                Edit
                              </button>
                              <button onClick={() => handleDeleteCategory(cat.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>No categories found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tags Table */}
              <div className="management-card">
                <div className="card-header">
                  <h2>🏷️ Tag Management</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchTags(1)}
                    disabled={tagLoading}
                  >
                    {tagLoading ? "Refreshing..." : "🔄 Refresh"}
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
                            <td>#{tag.id}</td>
                            <td>{tag.name}</td>
                            <td>
                              <span className={tag.is_active ? "active" : "inactive"}>
                                {tag.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{tag.created_by_name || "-"}</td>
                            <td>{tag.updated_by_name || "-"}</td>
                            <td>
                              <button onClick={() => handleEditTag(tag.id, tag.name)}>
                                Edit
                              </button>
                              <button onClick={() => handleDeleteTag(tag.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>No tags found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
