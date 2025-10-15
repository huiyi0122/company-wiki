import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import "../styles/EditorPage.css";

interface EditorPageProps {
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

export default function EditorPage({
  currentUser,
  setCurrentUser,
}: EditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("## Start writing your article...");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ---------------------- 获取分类 + 加载文章 ----------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    // 获取分类
    fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setCategories(result.data);
        }
      })
      .catch((err) => console.error("Error fetching categories:", err));

    // 编辑模式加载文章
    if (id) {
      fetch(`${API_BASE_URL}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            const article = result.data;
            setTitle(article.title);
            setContent(article.content);
            setCategoryId(article.category_id || null);
            setSelectedTags(article.tag_ids || []);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  // ---------------------- 新增分类 ----------------------
  const handleAddCategory = async () => {
    const name = window.prompt("Enter new category name:");
    if (!name?.trim()) {
      toast.warning("Category name cannot be empty.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to add category");

      toast.success(`Category "${name.trim()}" added successfully!`);
      const newCatObj = { id: result.data?.id || Date.now(), name: name.trim() };
      setCategories((prev) => [...prev, newCatObj]);
      setCategoryId(newCatObj.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category.");
    }
  };

  // ---------------------- 标签输入逻辑 ----------------------
  const handleTagInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const name = tagInput.trim().toLowerCase();
      if (!name) return;
      setTagInput("");

      // 检查是否已选
      if (tags.some((t) => t.name.toLowerCase() === name)) {
        const existingTag = tags.find((t) => t.name.toLowerCase() === name)!;
        if (!selectedTags.includes(existingTag.id)) {
          setSelectedTags([...selectedTags, existingTag.id]);
        }
        return;
      }

      const token = localStorage.getItem("token");
      try {
        // 1️⃣ 检查后端是否已有该 tag
        const res = await fetch(`${API_BASE_URL}/tags/search?name=${encodeURIComponent(name)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (result.success && result.data?.id) {
          // 已存在 → 选中
          if (!selectedTags.includes(result.data.id)) {
            setTags((prev) => [...prev, result.data]);
            setSelectedTags([...selectedTags, result.data.id]);
          }
        } else {
          // 2️⃣ 不存在 → 创建新 tag
          const createRes = await fetch(`${API_BASE_URL}/tags`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name }),
          });
          const createResult = await createRes.json();
          if (createResult.success && createResult.data?.id) {
            const newTag = { id: createResult.data.id, name };
            setTags((prev) => [...prev, newTag]);
            setSelectedTags([...selectedTags, newTag.id]);
            toast.success(`Created new tag "${name}"`);
          }
        }
      } catch (err) {
        console.error("Tag add error:", err);
      }
    }
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter((id) => id !== tagId));
  };

  // ---------------------- 保存文章 ----------------------
  const handleSave = async () => {
    if (!title || !content) return toast.warning("Title and content are required.");

    const token = localStorage.getItem("token");
    if (!token) return;

    const selectedTagNames = tags
      .filter((tag) => selectedTags.includes(tag.id))
      .map((tag) => tag.name);

    const payload = {
      title,
      content,
      category_id: categoryId,
      tags: selectedTagNames,
    };

    console.log("✅ Final payload:", payload);

    try {
      setLoading(true);
      const res = await fetch(
        id ? `${API_BASE_URL}/articles/${id}` : `${API_BASE_URL}/articles`,
        {
          method: id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Save failed");

      toast.success("Article saved successfully!");
      navigate("/docs");
    } catch (err) {
      console.error(err);
      toast.error("Save failed!");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="layout">
        <Sidebar setCategory={() => {}} currentUser={currentUser} setCurrentUser={setCurrentUser} />
        <div className="main-content-with-sidebar">
          <div className="editor-page">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading editor...</p>
            </div>
          </div>
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
        <div className="editor-page">
          <div className="page-header">
            <h1>{id ? "Edit Article" : "Create New Article"}</h1>
            <p>{id ? "Update your existing article" : "Write and publish a new article"}</p>
          </div>

          <div className="editor-card">
            <div className="card-header">
              <h2>Article Details</h2>
            </div>

            <div className="editor-form">
              {/* Title */}
              <div className="form-group">
                <label>Article Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title..."
                  className="form-input"
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label>Category</label>
                <div className="select-with-button">
                  <select
                    value={categoryId || ""}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn-add" onClick={handleAddCategory}>
                    + New
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label>Tags</label>
                <div className="tag-input-section">
                  <div className="selected-tags">
                    {tags
                      .filter((tag) => selectedTags.includes(tag.id))
                      .map((tag) => (
                        <span key={tag.id} className="tag-chip">
                          {tag.name}
                          <button className="remove-tag" onClick={() => removeTag(tag.id)}>
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type tag name and press Enter"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="form-group">
                <label>Content</label>
                <div className="editor-container">
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || "")}
                    height={400}
                    previewOptions={{ remarkPlugins: [remarkGfm, remarkGemoji] }}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="action-buttons">
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Article"
                  )}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate("/docs")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
