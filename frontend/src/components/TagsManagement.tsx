import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "./CommonTypes";
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";
import "../styles/Dashboard.css";

interface TagsManagementProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function TagsManagement({
  currentUser,
  setCurrentUser,
}: TagsManagementProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pagination, setPagination] = useState<{
    nextCursor: number | null;
    limit: number;
    hasMore: boolean;
  }>({
    nextCursor: null,
    limit: 20,
    hasMore: false,
  });

  const navigate = useNavigate();

  const canManage = currentUser && PERMISSIONS[currentUser.role].includes("edit");

  // 获取标签列表
  const fetchTags = async (lastId?: number, isLoadMore = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      let url = `${API_BASE_URL}/tags?limit=${pagination.limit}`;
      if (lastId) {
        url += `&lastId=${lastId}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];
      
      const nextCursor = result.meta?.nextCursor ?? null;
      const hasMore = !!nextCursor;

      if (isLoadMore) {
        setTags((prev) => [...prev, ...list]);
      } else {
        setTags(list);
      }

      setPagination(prev => ({
        ...prev,
        nextCursor,
        hasMore,
      }));
    } catch (err) {
      console.error("Tag fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // 编辑标签
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

  // 软删除标签
  const handleSoftDeleteTag = async (id: number) => {
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

  // 硬删除标签
  const handleHardDeleteTag = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this tag? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags/hard/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (result.success) {
        setMessage(`✅ ${result.data || result.message || "Tag permanently deleted."}`);
        setTags((prev) => prev.filter((t) => t.id !== id));
      } else {
        setMessage(`❌ ${result.message || "Failed to permanently delete tag."}`);
      }
    } catch (err) {
      console.error("Hard delete tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // 恢复标签
  const handleRestoreTag = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags/restore/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (result.success) {
        setMessage(`✅ ${result.data || result.message || "Tag restored."}`);
        // 重新加载标签列表
        fetchTags();
      } else {
        setMessage(`❌ ${result.message || "Failed to restore tag."}`);
      }
    } catch (err) {
      console.error("Restore tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  // 创建新标签
  const handleCreateTag = async () => {
    const tagName = window.prompt("Enter new tag name:");
    if (!tagName || !tagName.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: tagName.trim() }),
      });
      const result = await res.json();

      if (result.success) {
        setMessage(`✅ Tag "${tagName.trim()}" created successfully`);
        // 重新加载第一页
        fetchTags();
      } else {
        setMessage(`❌ ${result.message || "Failed to create tag."}`);
      }
    } catch (err) {
      console.error("Create tag error:", err);
      setMessage("❌ Server connection failed.");
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchTags();
    }
  }, [canManage]);

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        Please login to view tags management.
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="layout">
        <div className="main-content-with-sidebar">
          <div className="dashboard-page">
            <div className="access-denied-card">
              <h2>🚫 Access Denied</h2>
              <p>
                You do not have the required permissions to manage tags.
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

  return (
    <div className="main-content-with-sidebar">
      <div className="dashboard-page">
        {/* Header Section */}
        <div className="page-header">
          <h1>Tags Management</h1>
          <p>
            Manage all tags in the system. You can create, edit, delete, and restore tags.
          </p>
        </div>

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

        {/* Tags Management Section */}
        <div className="management-card">
          <div className="card-header">
            <h2>🏷️ Tags Management</h2>
            <div className="header-actions">
              <button
                className="btn-primary"
                onClick={handleCreateTag}
              >
                + Add New Tag
              </button>
              <button
                className="refresh-btn"
                onClick={() => fetchTags()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Refreshing...
                  </>
                ) : (
                  "🔄 Refresh"
                )}
              </button>
            </div>
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
                      <td className="slug-cell">{tag.slug}</td>
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
                        {tag.is_active ? (
                          <>
                            <button
                              className="btn-edit"
                              onClick={() => handleEditTag(tag.id, tag.name)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleSoftDeleteTag(tag.id)}
                            >
                              Delete
                            </button>
                            {currentUser.role === "admin" && (
                              <button
                                className="btn-delete-hard"
                                onClick={() => handleHardDeleteTag(tag.id)}
                                title="Permanently delete"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-restore"
                              onClick={() => handleRestoreTag(tag.id)}
                            >
                              Restore
                            </button>
                            {currentUser.role === "admin" && (
                              <button
                                className="btn-delete-hard"
                                onClick={() => handleHardDeleteTag(tag.id)}
                                title="Permanently delete"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="no-data">
                      {loading ? "Loading tags..." : "No tags found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="loadmore-container">
                <button
                  className="btn-loadmore"
                  onClick={() => fetchTags(pagination.nextCursor, true)}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "↓ Load More"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}