// src/components/Dashboard.tsx
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
}

interface Tag {
  id: number;
  name: string;
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
  const fetchCategories = async () => {
    try {
      setCatLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setCategories(result.data);
      } else {
        setMessage("❌ Failed to load categories.");
      }
    } catch (err) {
      console.error("Category fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setCatLoading(false);
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
      if (result.success) {
        setMessage(`✅ ${result.data?.message || "Category deleted."}`);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setMessage(`❌ ${result.data?.message || "Failed to delete category."}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // ===== 获取标签（仅管理员） =====
  const fetchTags = async () => {
    try {
      setTagLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setTags(result.data);
      } else {
        setMessage("❌ Failed to load tags.");
      }
    } catch (err) {
      console.error("Tag fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setTagLoading(false);
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
        setMessage(`✅ ${result.data?.message || "Tag deleted."}`);
        setTags((prev) => prev.filter((t) => t.id !== id));
      } else {
        setMessage(`❌ ${result.data?.message || "Failed to delete tag."}`);
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
        <div className="main-content-with-sidebar dashboard-container error">
          <h2>Access Denied</h2>
          <p>You do not have the required permissions to view the Dashboard.</p>
          <p>Your role: {currentUser.role}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="layout">
        <Sidebar setCategory={setCategory} currentUser={currentUser} setCurrentUser={setCurrentUser} />
        <div className="main-content-with-sidebar dashboard-container">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar setCategory={setCategory} currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <div className="main-content-with-sidebar dashboard-container">
        <div className="dashboard-top">
          <h1>👋 Welcome back, {currentUser.username}!</h1>
          <p className="dashboard-role">
            Role: <strong>{currentUser.role}</strong>
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Articles</h3>
              <p className="stat-value">{stats.totalArticles}</p>
            </div>

            <div className="stat-card pending">
              <h3>Drafts Pending Review</h3>
              <p className="stat-value">{stats.draftsPendingReview}</p>
            </div>

            <div className="stat-card">
              <h3>New Users (Last 7 Days)</h3>
              <p className="stat-value">{stats.newUsersLast7Days}</p>
            </div>
          </div>

          {/* 分类管理 */}
          {currentUser.role === "admin" && (
            <>
              <section className="category-section">
                <h2>📂 Category Management</h2>
                <button onClick={fetchCategories} disabled={catLoading}>
                  {catLoading ? "Refreshing..." : "Refresh List"}
                </button>
                {message && <p className="message">{message}</p>}
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <tr key={cat.id}>
                          <td>{cat.id}</td>
                          <td>{cat.name}</td>
                          <td>
                            <button className="btn-delete" onClick={() => handleDeleteCategory(cat.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No categories found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              {/* 标签管理 */}
              <section className="tag-section">
                <h2>🏷️ Tag Management</h2>
                <button onClick={fetchTags} disabled={tagLoading}>
                  {tagLoading ? "Refreshing..." : "Refresh List"}
                </button>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <tr key={tag.id}>
                          <td>{tag.id}</td>
                          <td>{tag.name}</td>
                          <td>
                            <button onClick={() => handleEditTag(tag.id, tag.name)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDeleteTag(tag.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No tags found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <section className="recent-activity">
            <h2>Recent Activity</h2>
            <ul>
              <li>User **ABC** submitted a new draft: *Q3 Marketing Strategy*.</li>
              <li>User **DEF** approved article *Onboarding Flow Update*.</li>
              <li>Category **HR** created by **system**.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
