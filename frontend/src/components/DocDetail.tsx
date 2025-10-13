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

  // 🧩 加载分类映射 (Same as before)
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

  // 🏷️ 加载所有标签
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

  // 📄 加载文档详情 (修正标签依赖问题)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    
    // ⚠️ 只有在标签加载完成（或至少开始加载）后，才开始加载文档详情。
    // 但是，最关键的是确保在处理文档数据时 allTags 是最新的。
    // 我们信任 React 的依赖数组。当 allTags 第一次加载完成时，会触发此 effect。

    setLoading(true);

    fetch(`${API_BASE_URL}/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          let article = result.data as DocItem;

          // ✅ 如果后端没有返回 tags (对象数组)，但有 tag_ids (ID 数组)
          // 并且 allTags 已经加载完成，则进行映射
          if (!article.tags && Array.isArray(article.tag_ids) && allTags.length > 0) {
            article.tags = allTags.filter((t) =>
              article.tag_ids!.includes(t.id)
            );
          }
          
          // 如果后端直接返回 tag_ids，但没有返回 author_id 或 created_at，这里也不会报错。
          setDoc(article);
        } else {
          toast.error(result.message || "Failed to load document");
          setDoc(null); // 设置为 null 以显示 "Document not found"
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching document:", err);
        toast.error("Error fetching document!");
        setDoc(null);
      })
      .finally(() => setLoading(false));
  }, [id, allTags]); // 依赖 allTags，确保标签加载完成后，文档处理逻辑能正确运行

  // 🗑️ 删除文章 (Same as before)
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

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

  // ✅ 权限判断
  const canEdit =
    currentUser &&
    (currentUser.role === "admin" ||
      (currentUser.role === "editor" && doc?.author_id === currentUser.id));
  const canDelete = canEdit;

  if (loading) return <p className="loading-message">Loading document...</p>;
  if (!doc) return <p className="loading-message">Document not found ❌</p>;

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="doc-top">
          <h2>{doc.title}</h2>

          <p>
            <strong>Category:</strong>{" "}
            {categoryMap[doc.category_id || 0] || "Uncategorized"}
          </p>

          <p>
            <strong>Author:</strong> {doc.author || "Unknown"}
          </p>

          {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <div className="article-tags">
              <strong>Tags: </strong>
              {doc.tags.map((t: any, index: number) => {
                const tagName = typeof t === "string" ? t : t.name || "Untitled";
                return (
                  <span key={t.id || tagName} className="tag-pill-sm">
                    #{tagName}
                    {index < doc.tags.length - 1 && " "} {/* 用空格分隔 */}
                  </span>
                );
              })}
            </div>
          )}



          <p>
            <strong>Created:</strong>{" "}
            {doc.created_at
              ? new Date(doc.created_at).toLocaleString()
              : "N/A"}
          </p>

          <div className="doc-buttons" style={{ marginBottom: "20px" }}>
            {canEdit && (
              <button
                className="edit"
                onClick={() => navigate(`/editor/${id}`)}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button className="delete" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>

          <div
            id="doc-content"
            style={{
              padding: "0",
              background: "none",
              border: "none",
              borderRadius: "0",
            }}
          >
            <MDEditor
              value={doc.content}
              preview="preview"
              hideToolbar={true}
              height={700}
              previewOptions={{
                remarkPlugins: [remarkGfm, remarkGemoji],
              }}
            />
          </div>

          <button className="view" onClick={() => navigate("/docs")}>
            Back to Docs
          </button>
        </div>
      </div>
    </div>
  );
}