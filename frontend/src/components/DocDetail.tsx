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
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // ------------------- 加载分类 -------------------
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
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

  // ------------------- 加载标签 -------------------
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
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

  // ------------------- 加载文章 -------------------
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !id) {
      setLoading(false); // ✅ 避免无限 loading
      return;
    }

    setLoading(true);

    fetch(`${API_BASE_URL}/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setDoc(result.data);
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
  }, [id]);

  // ------------------- 填充标签 -------------------
  useEffect(() => {
    if (!doc || allTags.length === 0) return;
    if (!doc.tags && Array.isArray(doc.tag_ids)) {
      setDoc((prev) =>
        prev && {
          ...prev,
          tags: allTags.filter((t) => doc.tag_ids!.includes(t.id)),
        }
      );
    }
  }, [doc, allTags]);

  // ------------------- 删除文章 -------------------
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    const token = localStorage.getItem("accessToken");
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

  // ------------------- 权限判断 -------------------
  const canEdit =
    currentUser &&
    (currentUser.role === "admin" ||
      (currentUser.role === "editor" && doc?.author_id === currentUser.id));
  const canDelete = canEdit;

  // ------------------- 渲染 -------------------
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
          <nav className="breadcrumb">
            <button onClick={() => navigate("/docs")} className="breadcrumb-link">
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

          <h1 className="doc-title">{doc.title}</h1>

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

          {Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <div className="doc-tags">
              {doc.tags.map((t: any, i) => (
                <span key={i} className="tag-badge">
                  #{typeof t === "string" ? t : t.name || "Untitled"}
                </span>
              ))}
            </div>
          )}

          <hr className="doc-divider" />

          <div className="doc-content">
            <MDEditor.Markdown
              source={doc.content}
              style={{ background: "transparent" }}
              remarkPlugins={[remarkGfm, remarkGemoji]}
            />
          </div>

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
