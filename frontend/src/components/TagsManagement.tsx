import React, { useEffect, useState, useRef } from "react";
import type { User } from "./CommonTypes";
import { PERMISSIONS } from "./CommonTypes";
import "../styles/Dashboard.css";
import { apiFetch } from "../utils/api";
import Sidebar from "./Sidebar";
import Modal from "./Modal";

interface Tag {
  id: number;
  name: string;
  slug: string;
  is_active?: number | boolean;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TagsManagementProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function TagsManagement({
  currentUser,
  setCurrentUser,
}: TagsManagementProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const modalInputRef = useRef("");

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
    inputType?: "text" | "none";
    inputValue?: string;
    targetId?: number;
    targetName?: string;
  }>({
    isOpen: false,
    title: "",
    content: "",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: "",
      content: "",
      confirmText: "Confirm",
      onConfirm: () => {},
      inputType: undefined,
      inputValue: undefined,
      targetId: undefined,
      targetName: undefined,
    });
    setMessage("");
    modalInputRef.current = "";
  };

  const canManage =
    currentUser && PERMISSIONS[currentUser.role].includes("edit");

  const parseListData = (result: any) => {
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.data?.data)) return result.data.data;
    return [];
  };

  // ===== 获取标签 =====
  const fetchTags = async (page = 1) => {
    try {
      setLoading(true);
      const url = `/tags?page=${page}&limit=${pagination.limit}&include_inactive=true&sort=updated_at&order=desc`;

      const res = await apiFetch(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      let list = parseListData(result);

      // 🔧 前端排序：按 updated_at 降序，如果没有 updated_at 则使用 created_at
      list = list.sort((a:Tag, b:Tag) => {
        // 处理时间的辅助函数
        const getTime = (tag: Tag) => {
          // 优先使用 updated_at
          if (tag.updated_at && tag.updated_at !== "-" && tag.updated_at !== null) {
            return new Date(tag.updated_at).getTime();
          }
          // 如果没有 updated_at，使用 created_at
          if (tag.created_at && tag.created_at !== "-" && tag.created_at !== null) {
            return new Date(tag.created_at).getTime();
          }
          // 都没有则返回 0（排在最后）
          return 0;
        };

        const dateA = getTime(a);
        const dateB = getTime(b);

        return dateB - dateA; // 降序：最新的在前
      });

      const total = result.meta?.total ?? list.length;
      const totalPages =
        result.meta?.totalPages ?? Math.ceil(total / pagination.limit);

      setTags(list);
      setPagination((prev) => ({
        ...prev,
        page,
        total,
        totalPages,
      }));
    } catch (err) {
      console.error("Tag fetch error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ===== 标签操作 (Modal) =====

  // ✏️ Edit Tag
  const handleEditTag = (id: number, oldName: string) => {
    modalInputRef.current = oldName;

    setModalState({
      isOpen: true,
      title: "✏️ Edit Tag Name",
      content: (
        <>
          <p>Enter new name for tag #{id} (Current: {oldName})</p>
        </>
      ),
      confirmText: "Save",
      inputType: "text",
      inputValue: oldName,
      targetId: id,
      targetName: oldName,
      onConfirm: async () => {
        const newName = modalInputRef.current?.trim();

        if (!newName || newName === oldName) {
          setMessage("⚠️ Tag name not changed or empty.");
          return;
        }

        try {
          const res = await apiFetch(`/tags/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name: newName }),
          });
          const result = await res.json();

          if (result.success) {
            setMessage(`✅ Tag updated to "${newName}"`);
            closeModal();
            fetchTags(1); // 跳转到第1页并重新获取
          } else {
            const errorMsg =
              result.error || result.message || "Failed to update tag.";
            setMessage(`❌ ${errorMsg}`);
          }
        } catch (err) {
          console.error("Edit tag error:", err);
          setMessage("❌ Server connection failed.");
        }
      },
    });
  };

  // ➕ Create Tag
  const handleCreateTag = () => {
    modalInputRef.current = "";

    setModalState({
      isOpen: true,
      title: "➕ Create New Tag",
      content: (
        <>
          <p>Enter name for new tag:</p>
        </>
      ),
      confirmText: "Create",
      inputType: "text",
      inputValue: "",
      onConfirm: async () => {
        const newName = modalInputRef.current?.trim();

        if (!newName) {
          setMessage("⚠️ Tag name cannot be empty.");
          return;
        }

        try {
          const res = await apiFetch(`/tags`, {
            method: "POST",
            body: JSON.stringify({ name: newName }),
          });
          const result = await res.json();

          if (result.success) {
            setMessage(`✅ Tag "${newName}" created successfully`);
            closeModal();
            fetchTags(1); // 跳转到第1页并重新获取
          } else {
            const errorMsg =
              result.error || result.message || "Failed to create tag.";
            setMessage(`❌ ${errorMsg}`);
          }
        } catch (err) {
          console.error("Create tag error:", err);
          setMessage("❌ Server connection failed.");
        }
      },
    });
  };

  // 🗑️ Soft Delete Tag
  const handleSoftDeleteTag = (id: number, name: string) => {
    const confirmMsg =
      "Are you sure you want to soft delete this tag?\n\n" +
      "⚠️ Note: This tag must not be used by any articles before deletion.";

    setModalState({
      isOpen: true,
      title: `🗑️ Soft Delete Tag: ${name}`,
      content: <p>{confirmMsg}</p>,
      confirmText: "Soft Delete",
      targetId: id,
      targetName: name,
      onConfirm: async () => {
        closeModal();

        try {
          const res = await apiFetch(`/tags/${id}`, {
            method: "DELETE",
          });
          const result = await res.json();

          if (result.success) {
            setMessage(`✅ Tag "${name}" soft-deleted successfully`);
            fetchTags(1); // 跳转到第1页并重新获取
          } else {
            const errorMsg =
              result.error || result.message || "Failed to delete tag";
            setMessage(`❌ ${errorMsg}`);
          }
        } catch (err) {
          console.error("Soft delete tag error:", err);
          setMessage("❌ Failed to connect to server.");
        }
      },
    });
  };

  // ♻️ Restore Tag
  const handleRestoreTag = async (id: number) => {
    try {
      const res = await apiFetch(`/tags/restore/${id}`, {
        method: "PATCH",
      });
      const result = await res.json();

      if (result.success) {
        setMessage(
          `✅ ${
            result.data?.message || result.message || "Tag restored successfully."
          }`
        );
        fetchTags(1); // 跳转到第1页并重新获取
      } else {
        setMessage(`❌ ${result.error || result.message || "Failed to restore"}`);
      }
    } catch (err) {
      console.error("Restore tag error:", err);
      setMessage("❌ Failed to connect to server.");
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
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />

        <div className="main-content-with-sidebar">
          <div className="dashboard-page">
            <div className="access-denied-card">
              <h2>🚫 Access Denied</h2>
              <p>You do not have the required permissions to manage tags.</p>
              <p className="user-role">
                Your role: <span>{currentUser.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="layout">
      {/* ✅ Sidebar now included */}
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="dashboard-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>Tags Management</h1>
            <p>
              Manage all tags in the system. You can create, edit, delete, and
              restore tags.
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
              <h2>🏷️ Tag Management</h2>
              <div className="header-actions">
                <button className="btn-primary" onClick={handleCreateTag}>
                  + Add New Tag
                </button>
                <button
                  className="refresh-btn"
                  onClick={() => fetchTags(pagination.page)}
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
                    tags.map((tag) => {
                      const isActive =
                        typeof tag.is_active === "boolean"
                          ? tag.is_active
                          : !!tag.is_active;

                      return (
                        <tr key={tag.id}>
                          <td>#{tag.id}</td>
                          <td>{tag.name}</td>
                          <td>{tag.slug}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                isActive ? "active" : "inactive"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{tag.created_by_name || "-"}</td>
                          <td>{tag.updated_by_name || "-"}</td>
                          <td>
                            {isActive ? (
                              <>
                                <button
                                  className="btn-edit"
                                  onClick={() =>
                                    handleEditTag(tag.id, tag.name)
                                  }
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() =>
                                    handleSoftDeleteTag(tag.id, tag.name)
                                  }
                                >
                                  🗑️ Soft Delete
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-restore"
                                onClick={() => handleRestoreTag(tag.id)}
                              >
                                ♻️ Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="no-data">
                        {loading ? "Loading tags..." : "No tags found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 分页控制器 */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="btn-page"
                    disabled={pagination.page === 1 || loading}
                    onClick={() => fetchTags(pagination.page - 1)}
                  >
                    ← Prev
                  </button>
                  <span className="page-info">
                    Page {pagination.page} of {totalPages}
                  </span>
                  <button
                    className="btn-page"
                    disabled={pagination.page >= totalPages || loading}
                    onClick={() => fetchTags(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalState.isOpen}
        title={modalState.title}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
      >
        <div className="modal-content-wrapper">
          {typeof modalState.content === "string" ? (
            <p>{modalState.content}</p>
          ) : (
            modalState.content
          )}

          {modalState.inputType === "text" && (
            <input
              type="text"
              className="modal-input"
              defaultValue={modalState.inputValue}
              onChange={(e) => {
                modalInputRef.current = e.target.value;
              }}
              placeholder="Enter tag name"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}