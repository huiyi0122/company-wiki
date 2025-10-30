import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import Modal from "./Modal"; // ✅ 新增导入
import type { User, DocItem } from "./CommonTypes";
import { apiFetch } from "../utils/api";
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

  interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode; 
    confirmText: string;
    targetId: number;
    targetName: string;
    onConfirm: () => Promise<void>;
  }

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    content: "", // 可以是 string 或 JSX
    confirmText: "",
    targetId: 0,
    targetName: "",
    onConfirm: async () => {},
  });

  const [headings, setHeadings] = useState<
    Array<{ id: string; text: string; level: number }>
  >([]);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const closeModal = () =>
    setModalState((prev) => ({ ...prev, isOpen: false }));
  const [tocOpen, setTocOpen] = useState(false);

  // ------------------- 1️⃣ 初始化加载：分类 + 标签 -------------------
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [catRes, tagRes] = await Promise.all([
          apiFetch("/categories").then((res) => res.json()),
          apiFetch("/tags").then((res) => res.json()),
        ]);

        if (catRes.success && Array.isArray(catRes.data)) {
          const map: Record<number, string> = {};
          catRes.data.forEach((c: any) => (map[c.id] = c.name));
          setCategoryMap(map);
        }

        if (tagRes.success && Array.isArray(tagRes.data)) {
          setAllTags(tagRes.data);
        }
      } catch (err) {
        console.error("❌ Error loading initial data:", err);
      }
    }

    fetchInitialData();
  }, []);

  // ------------------- 2️⃣ 加载单篇文章 -------------------
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchArticle() {
      try {
        setLoading(true);
        const res = await apiFetch(`/articles/${id}`);
        const result = await res.json();

        if (result.success && result.data) {
          setDoc(result.data);
        } else {
          toast.error(result.message || "Failed to load document");
          setDoc(null);
        }
      } catch (err) {
        console.error("❌ Error fetching document:", err);
        toast.error("Error fetching document!");
        setDoc(null);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [id]);

  const tagsToShow = useMemo(() => {
    if (!doc) return [];
    if (Array.isArray(doc.tags)) return doc.tags;
    if (Array.isArray(doc.tag_ids))
      return allTags.filter((t) => doc.tag_ids!.includes(t.id));
    return [];
  }, [doc, allTags]);

  // 提取目录标题
  useEffect(() => {
    if (!doc?.content) return;

    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const matches = [...doc.content.matchAll(headingRegex)];

    const extractedHeadings = matches.map((match, index) => {
      const level = match[1].length;
      const text = match[2].trim();
      const id = `heading-${index}-${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`;
      return { id, text, level };
    });

    setHeadings(extractedHeadings);
  }, [doc?.content]);

  // 监听滚动，高亮当前标题
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveHeading(headings[i].id);
          return;
        }
      }
      setActiveHeading("");
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // 为标题添加 ID
  useEffect(() => {
    if (headings.length === 0) return;

    const timer = setTimeout(() => {
      const contentDiv = document.querySelector(".doc-content");
      if (!contentDiv) return;

      const allHeadings = contentDiv.querySelectorAll("h1, h2, h3");
      allHeadings.forEach((heading, index) => {
        if (headings[index]) {
          heading.id = headings[index].id;
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [headings, doc]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({ top: elementPosition, behavior: "smooth" });
    }
  };

  // ------------------- 删除文章（改用 Modal） -------------------
  const handleDelete = () => {
    if (!doc) return;

    setModalState({
      isOpen: true,
      title: "🗑️ Confirm Deletion",
      content: (
        <p>
          Are you sure you want to delete the document{" "}
          <strong>{doc.title}</strong>?
        </p>
      ),
      confirmText: "Delete",
      targetId: Number(id),
      targetName: doc.title,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/articles/${id}`, { method: "DELETE" });
          const result = await res.json();

          if (!result.success)
            throw new Error(result.message || "Delete failed");

          toast.success("Document deleted successfully!");
          closeModal();
          navigate("/docs");
        } catch (err) {
          console.error("❌ Soft delete failed:", err);
          toast.error("Delete failed!");
        }
      },
    });
  };

  // ------------------- 权限控制 -------------------
  const canEdit =
    currentUser &&
    (currentUser.role === "admin" ||
      (currentUser.role === "editor" && doc?.author === currentUser.username));
  const canDelete = canEdit;

  // ------------------- 渲染逻辑 -------------------
  if (loading) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={() => { }}
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
          setCategory={() => { }}
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
        setCategory={() => { }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="doc-detail-wrapper">
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

            {/* 编辑与删除按钮 */}
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
                {doc.create_at
                  ? new Date(doc.create_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>

            {/* 标签 */}
            {tagsToShow.length > 0 && (
              <div className="doc-tags">
                {tagsToShow.map((t: any, i) => (
                  <span key={i} className="tag-badge">
                    #{typeof t === "string" ? t : t.name || "Untitled"}
                  </span>
                ))}
              </div>
            )}

            <hr className="doc-divider" />

            {/* Markdown 内容 */}
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

          {/* 目录侧边栏 */}
          {headings.length > 0 && (
            <aside className={`toc-sidebar ${tocOpen ? "toc-open" : ""}`}>
              <div className="toc-container">
                <div className="toc-header">
                  <div className="toc-header-content">
                    <span className="toc-icon">📋</span>
                    <h3 className="toc-title">Table of Contents</h3>
                  </div>
                  <button
                    className="toc-toggle-btn"
                    onClick={() => setTocOpen(!tocOpen)}
                    aria-label="Toggle table of contents"
                  >
                    {tocOpen ? "✕" : "☰"}
                  </button>
                </div>
                <nav className="toc-nav">
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      onClick={() => {
                        scrollToHeading(heading.id);
                        // 小屏幕点击后自动收起
                        if (window.innerWidth <= 1024) {
                          setTocOpen(false);
                        }
                      }}
                      className={`toc-item toc-level-${heading.level} ${
                        activeHeading === heading.id ? "active" : ""
                      }`}
                      title={heading.text}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* 小屏幕浮动按钮 - 在 aside 外面 */}
          {headings.length > 0 && (
            <button
              className="toc-floating-btn"
              onClick={() => setTocOpen(true)}
              aria-label="Open table of contents"
            >
              📋
            </button>
          )}

          {/* 遮罩层 - 在 aside 外面 */}
          {tocOpen && (
            <div className="toc-overlay" onClick={() => setTocOpen(false)} />
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
          {typeof modalState.content === "string"
            ? modalState.content
            : modalState.content}
        </div>
      </Modal>
    </div>
  );
}
