import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "./CommonTypes";
import { PERMISSIONS } from "./CommonTypes";
import "../styles/Dashboard.css";
import Sidebar from "./Sidebar";
import { apiFetch } from "../utils/api";
import Modal from "./Modal";
import { toast } from "react-toastify";

interface DashboardProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Category {
  id: number;
  name: string;
  is_active?: number;
  created_by?: string | null;           // 用户ID
  created_by_name?: string | null;      // 用户名
  updated_by?: string | null;           // 用户ID
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Tag {
  id: number;
  name: string;
  is_active?: number | boolean;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface Article {
  id: number;
  title: string;
  content: string;
  category_id?: number | null;
  author_id?: number;
  tags: string[];
  author: string;
  created_by?: string;
  updated_by?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface LogRecord {
  id: number;
  type: 'article' | 'tag' | 'category';
  target_id: number;
  action: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  old_data: string | null;
  new_data: string | null;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

const fetchStats = async () => {
  try {
    // 获取文章总数
    const articlesRes = await apiFetch("/articles");
    const articlesResult = await articlesRes.json();

    if (!articlesResult.success) {
      throw new Error(articlesResult.message || "Failed to fetch articles");
    }

    const totalArticles = articlesResult.meta?.total || 0;

    // 获取用户总数
    let totalUsers = 0;
    try {
      const usersRes = await apiFetch("/users");
      const usersResult = await usersRes.json();

      if (usersResult.success && Array.isArray(usersResult.data)) {
        totalUsers = usersResult.data.length; // 直接计算数组长度
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }

    return {
      totalArticles,
      deletedArticles: 0,
      totalUsers, // 改为 totalUsers
    };
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    return {
      totalArticles: 0,
      deletedArticles: 0,
      totalUsers: 0,
    };
  }
};

export default function Dashboard({
  currentUser,
  setCurrentUser,
}: DashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalArticles: 0,
    deletedArticles: 0,
    totalUsers: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deletedArticles, setDeletedArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [_, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Filter states for logs
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all");
  const [logDateFilter, setLogDateFilter] = useState<string>("all");
  const [logStartDate, setLogStartDate] = useState<string>("");
  const [logEndDate, setLogEndDate] = useState<string>("");


  const [tagPagination, setTagPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [articlePagination, setArticlePagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [logPagination, setLogPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
  });

  const modalInputRef = useRef("");

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
    inputType?: 'text' | 'none';
    inputValue?: string;
    targetId?: number;
    targetName?: string;
    targetOldStatus?: boolean;
  }>({
    isOpen: false,
    title: "",
    content: "",
    confirmText: "Confirm",
    onConfirm: () => { },
  });

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: "",
      content: "",
      confirmText: "Confirm",
      onConfirm: () => { },
      inputType: undefined,
      inputValue: undefined,
      targetId: undefined,
      targetName: undefined,
      targetOldStatus: undefined,
    });
    setMessage("");
    modalInputRef.current = "";
  };

  const canManage = currentUser && PERMISSIONS[currentUser.role].includes("edit");

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

  const parseListData = (result: any) => {
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.data?.data)) return result.data.data;
    return [];
  };

  // ===== 获取分类 =====
  const fetchCategories = async () => {
    try {
      setCatLoading(true);
      const url = `/categories?&include_inactive=true`;

      const res = await apiFetch(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      setCategories(result.data);

    } catch (err) {
      console.error("Category fetch error:", err);
      toast.error("Failed to connect to server.");
    } finally {
      setCatLoading(false);
    }
  };

  // ===== 获取标签 =====
  const fetchTags = async (page = 1) => {
    try {
      setTagLoading(true);
      const url = `/tags?page=${page}&limit=${tagPagination.limit}&include_inactive=true`;

      const res = await apiFetch(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      let list = result.data;
      list = list.sort((a: Tag, b: Tag) => {

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

      setTags(list);
      setTagPagination({
        page,
        limit: result.meta?.limit ?? 10,
        total,
      });
    } catch (err) {
      console.error("Tag fetch error:", err);
      toast.error("Failed to connect to server.");
    } finally {
      setTagLoading(false);
    }
  };

  // ===== 获取软删除的文章 =====
  const fetchDeletedArticles = async (page = 1) => {
    try {
      setArticleLoading(true);
      const url = `/articles?page=${page}&limit=${articlePagination.limit}&include_inactive=true`;

      const res = await apiFetch(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      const list = parseListData(result);
      const inactiveArticles = list.filter((article: Article) => !article.is_active);
      const total = inactiveArticles.length;

      setDeletedArticles(inactiveArticles);
      setArticlePagination({
        page,
        limit: result.meta?.limit ?? 10,
        total,
      });
    } catch (err) {
      console.error("Article fetch error:", err);
      toast.error("Failed to connect to server.");
    } finally {
      setArticleLoading(false);
    }
  };

  // ===== 获取历史日志（带时间过滤） =====
  const fetchLogs = async (
    page = 1,
    type = logTypeFilter,
    dateFilter = logDateFilter,
    startDate = logStartDate,
    endDate = logEndDate
  ) => {
    try {
      setLogLoading(true);
      let url = `/logs?page=${page}&limit=${logPagination.limit}`;

      if (type !== "all") url += `&type=${type}`;

      if (dateFilter === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (dateFilter === "today") {
        const today = new Date().toISOString().split("T")[0];
        url += `&date=${today}`;
      } else if (dateFilter === "week") {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        url += `&startDate=${weekAgo.toISOString().split("T")[0]}&endDate=${today.toISOString().split("T")[0]}`;
      } else if (dateFilter === "month") {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        url += `&year=${year}&month=${month}`;
      } else if (dateFilter === "year") {
        const year = new Date().getFullYear();
        url += `&year=${year}`;
      }

      const res = await apiFetch(url);
      const result = await res.json();

      if (!result.success) {
        setMessage(`❌ ${result.message || "Failed to fetch logs"}`);
        return;
      }

      setLogs(result.data || []);
      setLogPagination({
        page: result.page || page,
        limit: result.limit || logPagination.limit,
        total: result.total || 0,
      });
    } catch (err) {
      console.error("Log fetch error:", err);
      toast.error("Failed to load logs.");
    } finally {
      setLogLoading(false);
    }
  };

  // ===== 恢复文章 =====
  const handleRestoreArticle = async (id: number, title: string) => {
    try {
      const res = await apiFetch(`/articles/restore/${id}`, {
        method: "POST",
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`Article "${title}" restored successfully!`);
        fetchDeletedArticles(articlePagination.page);
        fetchStats().then(setStats);
        fetchLogs(1);
      } else {
        toast.error(`${result.error || result.message || "Failed to restore"}`);
      }
    } catch (err) {
      console.error("Restore article error:", err);
      toast.error("Failed to connect to server.");
    }
  };

  const handleEditArticle = (id: number) => {
    navigate(`/editor/${id}`);
  };

  // ===== 分类操作 =====
  const handleEditCategory = (id: number, oldName: string, oldStatus: boolean, createdBy?: string) => {
    modalInputRef.current = oldName;

    setModalState({
      isOpen: true,
      title: "✏️ Edit Category Name",
      content: <p>Enter new name for category #{id} (Current: {oldName})</p>,
      confirmText: "Save",
      inputType: 'text',
      inputValue: oldName,
      targetId: id,
      targetName: oldName,
      targetOldStatus: oldStatus,
      onConfirm: async () => {
        const newName = modalInputRef.current?.trim();

        if (!newName || newName === oldName) {
          toast.warn("Category name not changed or empty.");
          return;
        }

        try {
          const res = await apiFetch(`/categories/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              name: newName,
              is_active: oldStatus,
              created_by: createdBy  // 保留原有的 created_by
            }),
          });
          const result = await res.json();

          if (result.success) {
            toast.success(`Category updated to "${newName}"`);
            fetchCategories();
            fetchLogs(1);
            closeModal();
          } else {
            const errorMsg = result.error || result.message || "Failed to update category.";
            toast.error(`${errorMsg}`);
          }
        } catch (err) {
          console.error("Edit category error:", err);
          toast.error("Server connection failed.");
        }
      },
    });
  };

  const handleSoftDeleteCategory = (id: number, name: string) => {
    const confirmMsg =
      "Are you sure you want to soft delete this category?\n\n" +
      "⚠️ Note: This category must not be used by any articles before deletion.";

    setModalState({
      isOpen: true,
      title: `🗑️ Soft Delete Category: ${name}`,
      content: <p>{confirmMsg}</p>,
      confirmText: "Soft Delete",
      targetId: id,
      targetName: name,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await apiFetch(`/categories/${id}`, {
            method: "DELETE"
          });
          const result = await res.json();

          if (result.success) {
            toast.success(`${result.data?.message || result.message || "Category soft-deleted successfully."}`);
            fetchCategories();
            fetchLogs(1);
          } else {
            const errorMsg = result.error || result.message || "Failed to delete category";
            toast.error(`${errorMsg}`);
          }
        } catch (err) {
          console.error("Soft delete category error:", err);
          toast.error("Failed to connect to server.");
        }
      },
    });
  };

  const handleRestoreCategory = async (id: number) => {
    try {
      const res = await apiFetch(`/categories/restore/${id}`, {
        method: "PATCH"
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`${result.data?.message || result.message || "Category restored successfully."}`);
        fetchCategories();
        fetchLogs(1);
      } else {
        toast.error(`${result.error || result.message || "Failed to restore"}`);
      }
    } catch (err) {
      console.error("Restore category error:", err);
      toast.error("Failed to connect to server.");
    }
  };

  // ===== 标签操作 =====
  const handleEditTag = (id: number, oldName: string, createdBy?: string) => {
    modalInputRef.current = oldName;

    setModalState({
      isOpen: true,
      title: "✏️ Edit Tag Name",
      content: <p>Enter new name for tag #{id} (Current: {oldName})</p>,
      confirmText: "Save",
      inputType: 'text',
      inputValue: oldName,
      targetId: id,
      targetName: oldName,
      onConfirm: async () => {
        const newName = modalInputRef.current?.trim();

        if (!newName || newName === oldName) {
          toast.warn("Tag name not changed or empty.");
          return;
        }

        try {
          const res = await apiFetch(`/tags/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              name: newName,
              created_by: createdBy  // 保留原有的 created_by
            }),
          });
          const result = await res.json();

          if (result.success) {
            toast.success(`Tag updated to "${newName}"`);
            fetchTags(tagPagination.page);
            fetchLogs(1);
            closeModal();
          } else {
            const errorMsg = result.error || result.message || "Failed to update tag.";
            toast.error(`${errorMsg}`);
          }
        } catch (err) {
          console.error("Edit tag error:", err);
          toast.error("Server connection failed.");
        }
      },
    });
  };

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
            method: "DELETE"
          });
          const result = await res.json();

          if (result.success) {
            setMessage(`✅ ${result.data?.message || result.message || "Tag soft-deleted successfully."}`);
            fetchTags(tagPagination.page);
            fetchLogs(1);
          } else {
            const errorMsg = result.error || result.message || "Failed to delete tag";
            toast.error(`${errorMsg}`);
          }
        } catch (err) {
          console.error("Soft delete tag error:", err);
          toast.error("Failed to connect to server.");
        }
      },
    });
  };

  const handleRestoreTag = async (id: number) => {
    try {
      const res = await apiFetch(`/tags/restore/${id}`, {
        method: "PATCH"
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`${result.data?.message || result.message || "Tag restored successfully."}`);
        fetchTags(tagPagination.page);
        fetchLogs(1);
      } else {
        toast.error(`${result.error || result.message || "Failed to restore"}`);
      }
    } catch (err) {
      console.error("Restore tag error:", err);
      toast.error("Failed to connect to server.");
    }
  };

  // ===== 渲染日志详情 =====
  const renderLogDetails = (log: LogRecord) => {
    const handleViewDetails = () => {
      // 使用新的路由格式：/logs/:type/:id
      navigate(`/logs/${log.type}/${log.id}`);
    };

    return (
      <div style={{ fontSize: '0.9em' }}>
        <button
          onClick={handleViewDetails}
          className="btn-view-details"
          style={{
            padding: '4px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.8em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="View change details"
        >
          🔍 View Details
        </button>
      </div>
    );
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchCategories();
      fetchTags();
      fetchDeletedArticles();
      fetchLogs();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchLogs(1, logTypeFilter, logDateFilter);
    }
  }, [logTypeFilter, logDateFilter]);

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        Please login to view the dashboard.
      </div>
    );
  }

  const RecentActivity = ({ activities }: { activities: Activity[] }) => {
    return (
      <div className="activity-card">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div key={act.id} className="activity-item">
                <div className="activity-icon">
                  {act.type === "article" ? "📄" :
                    act.type === "category" ? "📂" :
                      act.type === "tag" ? "🏷️" : "✅"}
                </div>
                <div className="activity-content">
                  <p>{act.description}</p>
                  <span className="activity-time">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p>No recent activity found.</p>
          )}
        </div>
      </div>
    );
  };

  const totalTagPages = Math.ceil(tagPagination.total / tagPagination.limit);
  const totalArticlePages = Math.ceil(articlePagination.total / articlePagination.limit);
  const totalLogPages = Math.ceil(logPagination.total / logPagination.limit);

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => { }}
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
                <div className="stat-icon">🗑️</div>
                <div className="stat-content">
                  <h3>Deleted Articles</h3>
                  <p className="stat-value">{deletedArticles.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <p className="stat-value">{stats.totalUsers}</p>
                </div>
              </div>
            </div>
          </section>

          {message && (
            <div
              className={`message ${message.includes("❌") ? "error" : "success"}`}
            >
              {message}
            </div>
          )}

          {/* Management Sections - Admin Only */}
          {currentUser.role === "admin" && (
            <div className="admin-sections">
              {/* History Logs Section */}
              <div className="management-card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                  <h2>📜 Activity History</h2>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px'
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="article">Articles</option>
                      <option value="category">Categories</option>
                      <option value="tag">Tags</option>
                    </select>

                    <select
                      value={logDateFilter}
                      onChange={(e) => setLogDateFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px'
                      }}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {logDateFilter === 'custom' && (
                      <>
                        <input
                          type="date"
                          value={logStartDate}
                          onChange={(e) => setLogStartDate(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ color: '#6b7280' }}>to</span>
                        <input
                          type="date"
                          value={logEndDate}
                          onChange={(e) => setLogEndDate(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px'
                          }}
                        />
                        <button
                          className="refresh-btn"
                          onClick={() => fetchLogs(1, logTypeFilter, "custom")}
                          disabled={logLoading || !logStartDate || !logEndDate}
                          style={{
                            opacity: (!logStartDate || !logEndDate) ? 0.5 : 1
                          }}
                        >
                          Apply
                        </button>

                      </>
                    )}

                    <button
                      className="refresh-btn"
                      onClick={() => fetchLogs(1)}
                      disabled={logLoading}
                    >
                      {logLoading ? "Refreshing..." : "🔄 Refresh"}
                    </button>
                  </div>
                </div>
                <div className="table-container">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Name</th>
                        <th>Action</th>
                        <th>Changed By</th>
                        <th>Date</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.map((log) => {
                          // 提取名称/标题
                          const getDisplayName = (log: LogRecord): string => {
                            try {
                              // 优先从 new_data 获取（CREATE/UPDATE 操作）
                              if (log.new_data) {
                                const newData = typeof log.new_data === 'string'
                                  ? JSON.parse(log.new_data)
                                  : log.new_data;

                                if (log.type === 'article' && newData.title) {
                                  return newData.title;
                                }
                                if ((log.type === 'tag' || log.type === 'category') && newData.name) {
                                  return newData.name;
                                }
                              }

                              // 如果 new_data 没有，从 old_data 获取（DELETE/SOFT_DELETE 操作）
                              if (log.old_data) {
                                const oldData = typeof log.old_data === 'string'
                                  ? JSON.parse(log.old_data)
                                  : log.old_data;

                                if (log.type === 'article' && oldData.title) {
                                  return oldData.title;
                                }
                                if ((log.type === 'tag' || log.type === 'category') && oldData.name) {
                                  return oldData.name;
                                }
                              }

                              return '-';
                            } catch (e) {
                              console.error('Error parsing log data:', e);
                              return '-';
                            }
                          };

                          const displayName = getDisplayName(log);

                          return (
                            <tr key={log.id}>
                              <td>#{log.target_id}</td>
                              <td>
                                <span className="status-badge active">
                                  {log.type}
                                </span>
                              </td>
                              <td>
                                <div style={{
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: '500'
                                }} title={displayName}>
                                  {displayName}
                                </div>
                              </td>
                              <td>
                                <strong>{log.action}</strong>
                              </td>
                              <td>{log.changed_by_name}</td>
                              <td>
                                {new Date(log.changed_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td>
                                {renderLogDetails(log)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="no-data">
                            {logLoading ? "Loading logs..." : "No activity logs found."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {totalLogPages > 1 && (
                    <div className="pagination-container">
                      <button
                        className="btn-page"
                        disabled={logPagination.page === 1 || logLoading}
                        onClick={() => fetchLogs(logPagination.page - 1)}
                      >
                        ← Prev
                      </button>
                      <span className="page-info">
                        Page {logPagination.page} of {totalLogPages}
                      </span>
                      <button
                        className="btn-page"
                        disabled={logPagination.page >= totalLogPages || logLoading}
                        onClick={() => fetchLogs(logPagination.page + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Deleted Articles Management */}
              <div className="management-card">
                <div className="card-header">
                  <h2>🗑️ Deleted Articles</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchDeletedArticles(1)}
                    disabled={articleLoading}
                  >
                    {articleLoading ? "Refreshing..." : "🔄 Refresh"}
                  </button>
                </div>
                <div className="table-container">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Deleted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedArticles.length > 0 ? (
                        deletedArticles.map((article) => (
                          <tr key={article.id}>
                            <td>#{article.id}</td>
                            <td>
                              <div style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {article.title}
                              </div>
                            </td>
                            <td>{article.author || "-"}</td>
                            <td>
                              {article.updated_at
                                ? new Date(article.updated_at).toLocaleDateString()
                                : "-"}
                            </td>
                            <td>
                              <button
                                className="btn-edit"
                                onClick={() => handleEditArticle(article.id)}
                                title="Edit article"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-restore"
                                onClick={() => handleRestoreArticle(article.id, article.title)}
                                title="Restore article"
                              >
                                ♻️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="no-data">
                            No deleted articles found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {totalArticlePages > 1 && (
                    <div className="pagination-container">
                      <button
                        className="btn-page"
                        disabled={articlePagination.page === 1 || articleLoading}
                        onClick={() => fetchDeletedArticles(articlePagination.page - 1)}
                      >
                        ← Prev
                      </button>
                      <span className="page-info">
                        Page {articlePagination.page} of {totalArticlePages}
                      </span>
                      <button
                        className="btn-page"
                        disabled={articlePagination.page >= totalArticlePages || articleLoading}
                        onClick={() => fetchDeletedArticles(articlePagination.page + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Management */}
              <div className="management-card">
                <div className="card-header">
                  <h2>📂 Category Management</h2>
                  <button
                    className="refresh-btn"
                    onClick={() => fetchCategories()}
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
                                className={`status-badge ${cat.is_active ? "active" : "inactive"}`}
                              >
                                {cat.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{cat.created_by_name || cat.created_by || "-"}</td>
                            <td>{cat.updated_by_name || cat.updated_by || "-"}</td>
                            <td>
                              {cat.is_active ? (
                                <>
                                  <button
                                    className="btn-edit"
                                    onClick={() => handleEditCategory(cat.id, cat.name, !!cat.is_active, cat.created_by || undefined)}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn-delete"
                                    onClick={() => handleSoftDeleteCategory(cat.id, cat.name)}
                                  >
                                    🗑️
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn-restore"
                                  onClick={() => handleRestoreCategory(cat.id)}
                                >
                                  ♻️
                                </button>
                              )}
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
                        tags.map((tag) => {
                          const isActive = typeof tag.is_active === 'boolean'
                            ? tag.is_active
                            : !!tag.is_active;

                          return (
                            <tr key={tag.id}>
                              <td>#{tag.id}</td>
                              <td>{tag.name}</td>
                              <td>
                                <span
                                  className={`status-badge ${isActive ? "active" : "inactive"}`}
                                >
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td>{tag.created_by_name || tag.created_by || "-"}</td>
                              <td>{tag.updated_by_name || tag.updated_by || "-"}</td>
                              <td>
                                {isActive ? (
                                  <>
                                    <button
                                      className="btn-edit"
                                      onClick={() => handleEditTag(tag.id, tag.name, tag.created_by || undefined)}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="btn-delete"
                                      onClick={() => handleSoftDeleteTag(tag.id, tag.name)}
                                    >
                                      🗑️
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn-restore"
                                    onClick={() => handleRestoreTag(tag.id)}
                                  >
                                    ♻️
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No tags found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

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
                        disabled={tagPagination.page >= totalTagPages || tagLoading}
                        onClick={() => fetchTags(tagPagination.page + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Recent Activity
              <RecentActivity activities={logs.map(log => ({
                id: log.id,
                type: log.type,
                description: `${log.changed_by_name} performed ${log.action} on ${log.type} #${log.target_id}`,
                timestamp: log.changed_at,
              }))} /> */}
              <RecentActivity activities={logs.slice(0, 3).map((log, index) => ({
                id: index, // Use index as fallback
                type: log.type,
                description: `${log.changed_by_name} performed ${log.action} on ${log.type} #${log.target_id}`,
                timestamp: log.changed_at,
              }))} />
            </div>
          )}
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
          {typeof modalState.content === 'string' ? <p>{modalState.content}</p> : modalState.content}

          {modalState.inputType === 'text' && (
            <input
              type="text"
              className="modal-input"
              value={modalState.inputValue}
              onChange={(e) => {
                setModalState({ ...modalState, inputValue: e.target.value });
                modalInputRef.current = e.target.value;
              }}
              placeholder="Enter new name"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
