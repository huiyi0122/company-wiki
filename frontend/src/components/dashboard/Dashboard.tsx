import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../CommonTypes";
import { PERMISSIONS } from "../CommonTypes";
import "../../styles/Dashboard.css";
import Sidebar from "../Sidebar";
import { apiFetch } from "../../utils/api";
import Modal from "../Modal";
import { toast } from "react-toastify";

// Import sub-components (同一个 dashboard 文件夹内)
import StatsSection from "./StatsSection";
import ActivityHistory from "./ActivityHistory";
import DeletedArticlesManagement from "./DeletedArticlesManagement";
import CategoryManagement from "./CategoryManagement";
import TagManagement from "./TagManagement";
import RecentActivity from "./RecentActivity";

interface DashboardProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Category {
  id: number;
  name: string;
  is_active?: number;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

const fetchStats = async () => {
  try {
    const articlesRes = await apiFetch("/articles");
    const articlesResult = await articlesRes.json();

    if (!articlesResult.success) {
      throw new Error(articlesResult.message || "Failed to fetch articles");
    }

    const totalArticles = articlesResult.meta?.total || 0;

    let totalUsers = 0;
    try {
      const usersRes = await apiFetch("/users");
      const usersResult = await usersRes.json();

      if (usersResult.success && Array.isArray(usersResult.data)) {
        totalUsers = usersResult.data.length;
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }

    return {
      totalArticles,
      deletedArticles: 0,
      totalUsers,
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

      const list = parseListData(result);
      setCategories(list);
    } catch (err) {
      console.error("Category fetch error:", err);
      toast.error("Failed to connect to server.");
    } finally {
      setCatLoading(false);
    }
  };

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

      let list = parseListData(result);
      list = list.sort((a: Tag, b: Tag) => {
        const getTime = (tag: Tag) => {
          if (tag.updated_at && tag.updated_at !== "-" && tag.updated_at !== null) {
            return new Date(tag.updated_at).getTime();
          }
          if (tag.created_at && tag.created_at !== "-" && tag.created_at !== null) {
            return new Date(tag.created_at).getTime();
          }
          return 0;
        };

        const dateA = getTime(a);
        const dateB = getTime(b);

        return dateB - dateA;
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
              created_by: createdBy
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
              created_by: createdBy
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

          <StatsSection
            totalArticles={stats.totalArticles}
            deletedArticlesCount={deletedArticles.length}
            totalUsers={stats.totalUsers}
          />

          {message && (
            <div
              className={`message ${message.includes("❌") ? "error" : "success"}`}
            >
              {message}
            </div>
          )}

          {currentUser.role === "admin" && (
            <div className="admin-sections">
              <ActivityHistory
                logs={logs}
                logLoading={logLoading}
                logTypeFilter={logTypeFilter}
                setLogTypeFilter={setLogTypeFilter}
                logDateFilter={logDateFilter}
                setLogDateFilter={setLogDateFilter}
                logStartDate={logStartDate}
                setLogStartDate={setLogStartDate}
                logEndDate={logEndDate}
                setLogEndDate={setLogEndDate}
                logPagination={logPagination}
                fetchLogs={fetchLogs}
              />

              <DeletedArticlesManagement
                deletedArticles={deletedArticles}
                articleLoading={articleLoading}
                articlePagination={articlePagination}
                onEditArticle={handleEditArticle}
                onRestoreArticle={handleRestoreArticle}
                onRefresh={fetchDeletedArticles}
              />

              <CategoryManagement
                categories={categories}
                catLoading={catLoading}
                onEditCategory={handleEditCategory}
                onSoftDeleteCategory={handleSoftDeleteCategory}
                onRestoreCategory={handleRestoreCategory}
                onRefresh={fetchCategories}
              />

              <TagManagement
                tags={tags}
                tagLoading={tagLoading}
                tagPagination={tagPagination}
                onEditTag={handleEditTag}
                onSoftDeleteTag={handleSoftDeleteTag}
                onRestoreTag={handleRestoreTag}
                onRefresh={fetchTags}
              />

              <RecentActivity
                activities={logs.slice(0, 3).map((log, index) => ({
                  id: index,
                  type: log.type,
                  description: `${log.changed_by_name} performed ${log.action} on ${log.type} #${log.target_id}`,
                  timestamp: log.changed_at,
                }))}
              />
            </div>
          )}
        </div>
      </div>

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