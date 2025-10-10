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
  slug?: string | null;
  is_active?: number;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Tag {
  id: number;
  name: string;
  slug?: string | null;
  is_active?: number;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
}

const fetchStats = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Missing token");

    const res = await fetch(`${API_BASE_URL}/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (!result.success)
      throw new Error(result.message || "Failed to fetch articles");

    const articles = result.data || [];

    return {
      totalArticles: articles.length,
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
  const [catPagination, setCatPagination] = useState<{ nextCursor: number | null; limit: number }>({
  nextCursor: null,
  limit: 20,
});
const [tagPagination, setTagPagination] = useState<{ nextCursor: number | null; limit: number }>({
  nextCursor: null,
  limit: 20,
});


  const setCategory = () => {};

  const canManage =
    currentUser && PERMISSIONS[currentUser.role].includes("edit");

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
// ✅ 获取 Categories（使用 lastId 分页）
const fetchCategories = async (lastId?: number) => {
  try {
    setCatLoading(true);
    const token = localStorage.getItem("token");

    // ✅ 改为 lastId 参数
    const url = `${API_BASE_URL}/categories?limit=${catPagination.limit}${
      lastId ? `&lastId=${lastId}` : ""
    }`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (!result.success) {
      setMessage(`❌ ${result.message}`);
      return;
    }

    const list = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
      ? result.data
      : [];

    // ✅ 分页：第一页替换，之后追加
    if (lastId) {
      setCategories((prev) => [...prev, ...list]);
    } else {
      setCategories(list);
    }

    // ✅ 更新分页游标（nextCursor 即最后一个 id）
    const nextCursor =
      list.length > 0 ? list[list.length - 1].id : null;

    setCatPagination({
      nextCursor,
      limit: result.data?.meta?.limit ?? 20,
    });
  } catch (err) {
    console.error("Category fetch error:", err);
    setMessage("❌ Failed to connect to server.");
  } finally {
    setCatLoading(false);
  }
};



  // ===== 获取标签（仅管理员） =====
// ✅ 获取 Tags（使用 lastId 分页）
const fetchTags = async (lastId?: number) => {
  try {
    setTagLoading(true);
    const token = localStorage.getItem("token");

    // ✅ 改为 lastId 参数
    const url = `${API_BASE_URL}/tags?limit=${tagPagination.limit}${
      lastId ? `&lastId=${lastId}` : ""
    }`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (!result.success) {
      setMessage(`❌ ${result.message}`);
      return;
    }

    const list = Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.data)
      ? result.data
      : [];

    // ✅ 分页：第一页替换，之后追加
    if (lastId) {
      setTags((prev) => [...prev, ...list]);
    } else {
      setTags(list);
    }

    // ✅ 更新分页游标
    const nextCursor =
      list.length > 0 ? list[list.length - 1].id : null;

    setTagPagination({
      nextCursor,
      limit: result.data?.meta?.limit ?? 20,
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
        }),
      });
      const result = await res.json();

      if (result.success) {
        setMessage(`✅ Category "${newName.trim()}" updated successfully`);
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: newName.trim()} : c
          )
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
    if (!window.confirm("Are you sure you want to delete this category?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      const msg = result.message || result.error || "";

      if (!result.success && /used by/i.test(msg)) {
        const forceConfirm = window.confirm(
          "⚠️ This category is still used by some articles.\n\nIf you force delete it, all related articles will have no category.\n\nDo you want to force delete this category?"
        );
        if (forceConfirm) {
          const forceRes = await fetch(
            `${API_BASE_URL}/categories/${id}?force=true`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
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
      console.error("Delete error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // ===== 编辑标签 =====
  const handleEditTag = async (id: number, oldName: string) => {
    const newName = window.prompt("Enter new tag name:", oldName);
    if (!newName || newName.trim() === oldName) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
      fetchCategories();
      fetchTags();
    }
  }, [currentUser]);

  if (!currentUser) {
    return <div className="dashboard-container">Please login to view the dashboard.</div>;
  }

  if (!canManage) {
    return (
      <div className="layout">
        <Sidebar setCategory={setCategory} currentUser={currentUser} setCurrentUser={setCurrentUser} />
        <div className="main-content-with-sidebar">
          <div className="dashboard-page">
            <div className="access-denied-card">
              <h2>🚫 Access Denied</h2>
              <p>You do not have the required permissions to view the Dashboard.</p>
              <p className="user-role">Your role: <span>{currentUser.role}</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="layout">
        <Sidebar setCategory={setCategory} currentUser={currentUser} setCurrentUser={setCurrentUser} />
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
      <Sidebar setCategory={setCategory} currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <div className="main-content-with-sidebar">
        <div className="dashboard-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>Dashboard</h1>
            <p>Welcome back, {currentUser.username}! Here's your workspace overview.</p>
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
            <div className={`message ${message.includes("❌") ? "error" : "success"}`}>
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
                    onClick={() => fetchCategories()}
                    disabled={catLoading}
                  >
                    {catLoading ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Refreshing...
                      </>
                    ) : (
                      "🔄 Refresh"
                    )}
                  </button>
                </div>
                
                <div className="table-container">
                  <table className="management-table">
                   <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Slug</th>
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
                          <td>{cat.slug || "-"}</td>
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
                              onClick={() => handleEditCategory(cat.id, cat.name)}
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
                        <td colSpan={7} className="no-data">
                          No categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  </table>
                  {catPagination.nextCursor && (
                    <div className="loadmore-container">
                      <button
                        className="btn-loadmore"
                        onClick={() => fetchCategories(catPagination.nextCursor!)}
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
                    onClick={() => fetchTags(tagPagination.nextCursor!)}
                    disabled={tagLoading}
                  >
                    {tagLoading ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Refreshing...
                      </>
                    ) : (
                      "🔄 Refresh"
                    )}
                  </button>
                </div>
                
                <div className="table-container">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Slug</th>
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
                            <td>{tag.slug || "-"}</td>
                            <td>
                              <span className={`status-badge ${tag.is_active ? 'active' : 'inactive'}`}>
                                {tag.is_active ? 'Active' : 'Inactive'}
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
                          <td colSpan={5} className="no-data">
                            No tags found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {tagPagination.nextCursor && (
                    <div className="loadmore-container">
                      <button
                        className="btn-loadmore"
                        onClick={() => fetchTags(tagPagination.nextCursor!)}
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
                  <p><strong>ABC</strong> submitted a new draft</p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">✅</div>
                <div className="activity-content">
                  <p><strong>DEF</strong> approved an article</p>
                  <span className="activity-time">5 hours ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📂</div>
                <div className="activity-content">
                  <p>New category <strong>HR</strong> created</p>
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