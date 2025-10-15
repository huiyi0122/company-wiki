import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/DocDetail.css";

interface Tag {
  id: number;
  name: string;
}

interface DocDetailProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function DocDetail({
  currentUser,
  setCurrentUser,
}: DocDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const navigate = useNavigate();

  // 加载分类映射
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          const map: Record<number, string> = {};
          result.data.forEach((c: any) => (map[c.id] = c.name));
          setCategoryMap(map);
        }
      })
      .catch((err) => console.error("❌ Error loading categories:", err));
  }, []);

  // 加载所有标签
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setAllTags(result.data);
        }
      })
      .catch((err) => console.error("❌ Error loading tags:", err));
  }, []);

  // 加载文档详情
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    setLoading(true);

    fetch(`${API_BASE_URL}/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          let article = result.data as DocItem;

          if (
            !article.tags &&
            Array.isArray(article.tag_ids) &&
            allTags.length > 0
          ) {
            article.tags = allTags.filter((t) =>
              article.tag_ids!.includes(t.id)
            );
          }

          setDoc(article);
        } else {
          toast.error(result.message || "Failed to load document");
          setDoc(null);
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching document:", err);
        toast.error("Error fetching document!");
        setDoc(null);
      })
      .finally(() => setLoading(false));
  }, [id, allTags]);

  // 删除文章
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    const token = localStorage.getItem("token");
    if (!token || !id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (!result.success) throw new Error(result.message || "Delete failed");

      toast.success("Deleted successfully!");
      navigate("/docs");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      toast.error("Delete failed!");
    }
  };

  // 权限判断
  const canEdit =
    currentUser &&
    (currentUser.role === "admin" ||
      (currentUser.role === "editor" && doc?.author_id === currentUser.id));
  const canDelete = canEdit;

  if (loading) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="doc-loading">Loading document...</div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="doc-not-found">Document not found ❌</div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="doc-detail-container">
          {/* 面包屑导航 */}
          <nav className="breadcrumb">
            <button
              onClick={() => navigate("/docs")}
              className="breadcrumb-link"
            >
              Articles
            </button>
            <span className="breadcrumb-separator">›</span>
            <button
              onClick={() => navigate(`/docs?category_id=${doc.category_id}`)}
              className="breadcrumb-link"
            >
              {categoryMap[doc.category_id || 0] || "Uncategorized"}
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{doc.title}</span>
          </nav>

          {/* 操作按钮（右上角） */}
          {(canEdit || canDelete) && (
            <div className="doc-actions">
              {canEdit && (
                <button
                  className="action-btn edit-btn"
                  onClick={() => navigate(`/editor/${id}`)}
                  title="Edit article"
                >
                  ✏️ Edit
                </button>
              )}
              {canDelete && (
                <button
                  className="action-btn delete-btn"
                  onClick={handleDelete}
                  title="Delete article"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          )}

          {/* 文章标题 */}
          <h1 className="doc-title">{doc.title}</h1>

          {/* 文章元信息 */}
          <div className="doc-meta">
            <span className="meta-item">
              <span className="meta-icon">👤</span>
              {doc.author || "Unknown"}
            </span>
            <span className="meta-separator">•</span>
            <span className="meta-item">
              <span className="meta-icon">📅</span>
              {doc.created_at
                ? new Date(doc.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </span>
          </div>

          {/* 标签 */}
          {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <div className="doc-tags">
              {doc.tags.map((t: any) => {
                const tagName =
                  typeof t === "string" ? t : t.name || "Untitled";
                return (
                  <span key={t.id || tagName} className="tag-badge">
                    #{tagName}
                  </span>
                );
              })}
            </div>
          )}

          {/* 分割线 */}
          <hr className="doc-divider" />

          {/* 文章内容 */}
          <div className="doc-content">
            <MDEditor.Markdown
              source={doc.content}
              style={{ background: "transparent" }}
              remarkPlugins={[remarkGfm, remarkGemoji]}
            />
          </div>

          {/* 底部返回按钮 */}
          <div className="doc-footer">
            <button className="back-btn" onClick={() => navigate("/docs")}>
              ← Back to Articles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
