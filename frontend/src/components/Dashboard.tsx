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

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

const fetchStats = async () => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("Missing token");

    let totalArticles = 0;
    let nextCursor: number | null = null;
    const limit = 50;

    do {
      const url = `${API_BASE_URL}/articles?limit=${limit}${
        nextCursor ? `&lastId=${nextCursor}` : ""
      }`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      if (!result.success)
        throw new Error(result.message || "Failed to fetch articles");

      const list = Array.isArray(result.data?.data)
        ? result.data.data
        : Array.isArray(result.data)
        ? result.data
        : [];

      totalArticles += list.length;
      nextCursor =
        result.meta?.nextCursor ?? result.data?.meta?.nextCursor ?? null;
    } while (nextCursor);

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

  const [catPagination, setCatPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [tagPagination, setTagPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
  });

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

  // ======= 通用解析函数（防止 data 结构不同导致空） =======
  const parseListData = (result: any) => {
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.data?.data)) return result.data.data;
    return [];
  };

  // ===== 获取分类（页码分页） =====
  const fetchCategories = async (page = 1) => {
    try {
      setCatLoading(true);
      const token = localStorage.getItem("accessToken");
      const url = `${API_BASE_URL}/categories?page=${page}&limit=${catPagination.limit}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = parseListData(result);
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

  // ===== 获取标签（页码分页） =====
  const fetchTags = async (page = 1) => {
    try {
      setTagLoading(true);
      const token = localStorage.getItem("accessToken");
      const url = `${API_BASE_URL}/tags?page=${page}&limit=${tagPagination.limit}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = parseListData(result);
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

  // ===== 编辑 / 删除函数 =====
  const handleEditCategory = async (id: number, oldName: string) => {
    const newName = window.prompt("Enter new category name:", oldName);
    if (!newName || newName.trim() === oldName) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage(`✅ Category "${newName.trim()}" updated successfully`);
        fetchCategories(catPagination.page);
      } else {
        setMessage(`❌ ${result.message || "Failed to update category."}`);
      }
    } catch (err) {
      console.error("Edit category error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setMessage(`✅ ${result.message || "Category deleted"}`);
        fetchCategories(catPagination.page);
      } else {
        setMessage(`❌ ${result.message || "Failed to delete category."}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  const handleEditTag = async (id: number, oldName: string) => {
    const newName = window.prompt("Enter new tag name:", oldName);
    if (!newName || newName.trim() === oldName) return;
    try {
      const token = localStorage.getItem("accessToken");
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
        fetchTags(tagPagination.page);
      } else {
        setMessage(`❌ ${result.message || "Failed to update tag."}`);
      }
    } catch (err) {
      console.error("Edit tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setMessage(`✅ ${result.message || "Tag deleted."}`);
        fetchTags(tagPagination.page);
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
    return (
      <div className="dashboard-container">
        Please login to view the dashboard.
      </div>
    );
  }

  const totalCatPages = Math.ceil(catPagination.total / catPagination.limit);
  const totalTagPages = Math.ceil(tagPagination.total / tagPagination.limit);

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="dashboard-page">
          <div className="page-header">
            <h1>Dashboard</h1>
            <p>
              Welcome back, {currentUser.username}! Here's your workspace
              overview.
            </p>
          </div>

          {/* Stats */}
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
            <div
              className={`message ${
                message.includes("❌") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}

          {/* Category Management */}
          <div className="admin-sections">
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
                          <td>
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
                              onClick={() =>
                                handleDeleteCategory(cat.id)
                              }
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

                {/* ✅ 分类分页 */}
                {totalCatPages > 1 && (
                  <div className="pagination-container">
                    <button
                      className="btn-page"
                      disabled={catPagination.page === 1 || catLoading}
                      onClick={() => fetchCategories(catPagination.page - 1)}
                    >
                      ← Prev
                    </button>
                    <span className="page-info">
                      Page {catPagination.page} of {totalCatPages}
                    </span>
                    <button
                      className="btn-page"
                      disabled={
                        catPagination.page >= totalCatPages || catLoading
                      }
                      onClick={() => fetchCategories(catPagination.page + 1)}
                    >
                      Next →
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
                          <td>
                            <button
                              className="btn-edit"
                              onClick={() =>
                                handleEditTag(tag.id, tag.name)
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() =>
                                handleDeleteTag(tag.id)
                              }
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

                {/* ✅ 标签分页 */}
                {totalTagPages > 1 && (
                  <div className="pagination-container">
                    <button
                      className="btn-page"
                      disabled={tagPagination.page === 1 || tagLoading}
                      onClick={() => fetchTags(tagPagination.page - 1)}
                    >
                      ← Prev
                    </button>
                    <span className="page-info">
                      Page {tagPagination.page} of {totalTagPages}
                    </span>
                    <button
                      className="btn-page"
                      disabled={
                        tagPagination.page >= totalTagPages || tagLoading
                      }
                      onClick={() => fetchTags(tagPagination.page + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ Recent Activity */}
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
