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
  const [categoryId, setCategoryId] = useState<number | null>(null); // 用 id
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const navigate = useNavigate();

  // ---------------------- 获取分类 + 标签 + 加载文章 ----------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

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

    // 获取标签
    fetch(`${API_BASE_URL}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setTags(result.data);
        }
      })
      .catch((err) => console.error("Error fetching tags:", err));

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
            setCategoryId(article.category_id || null); // ✅ 直接用 id
            setSelectedTags(article.tag_ids || []);
          }
        })
        .catch((err) => console.error(err));
    } else {
      setTitle("");
      setContent("## Start writing your article...");
      setCategoryId(null);
      setSelectedTags([]);
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
      setCategoryId(newCatObj.id); // ✅ 直接选中新增分类
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category.");
    }
  };

  // ---------------------- 新增标签 ----------------------
  const handleAddTag = async () => {
    const name = window.prompt("Enter new tag name:");
    if (!name?.trim()) {
      toast.warning("Tag name cannot be empty.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to add tag");

      toast.success(`Tag "${name.trim()}" added successfully!`);
      const newTag = { id: result.data?.id || Date.now(), name: name.trim() };
      setTags((prev) => [...prev, newTag]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add tag.");
    }
  };

  // ---------------------- 保存文章 ----------------------
  const handleSave = async () => {
    if (!title || !content) return toast.warning("Title and content are required.");

    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = {
      title,
      content,
      category_id: categoryId, // ✅ 用 id
      tags: selectedTags, // ✅ 改这里
    };

    try {
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
    }
  };

  // ---------------------- 选择标签 ----------------------
  const toggleTagSelection = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <div className="edit-top">
          <h2>{id ? "Edit Article" : "New Article"}</h2>

          {/* Title */}
          <div className="title">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div
            className="Category"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <div>
              <label>Category:</label>
              <select
                value={categoryId || ""}
                onChange={(e) => setCategoryId(Number(e.target.value))}
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="add-category-btn" onClick={handleAddCategory}>
              + Add Category
            </button>
          </div>

          {/* Tags */}
          <div className="tags-section">
            <label>Tags:</label>
            <div className="tags-list">
              {tags.map((tag) => (
                <label key={tag.id} className="tag-item">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => toggleTagSelection(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
            <button className="add-tag-btn" onClick={handleAddTag}>
              + Add Tag
            </button>
          </div>

          {/* Markdown Editor */}
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            height={500}
            previewOptions={{ remarkPlugins: [remarkGfm, remarkGemoji] }}
          />

          {/* Buttons */}
          <div className="edit-btn">
            <button className="save" onClick={handleSave}>
              Save
            </button>
            <button className="back" onClick={() => navigate("/docs")}>
              Back to Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
