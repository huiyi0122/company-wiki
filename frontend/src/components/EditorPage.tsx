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
  const [allTags, setAllTags] = useState<Tag[]>([]); // 内存中所有标签
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownLocked, setDropdownLocked] = useState(false);

  const navigate = useNavigate();

  // ---------------------- 初始化：获取分类、标签、加载文章 ----------------------
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

    // 获取所有标签到内存
    fetch(`${API_BASE_URL}/tags?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setAllTags(result.data);
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
            setCategoryId(article.category_id || null);

            // 处理标签：从返回的数据中提取 tag IDs
            if (article.tags && Array.isArray(article.tags)) {
              // 将文章的标签与 allTags 匹配
              setAllTags((prevTags) => {
                const selectedTagIds: number[] = [];
                const newTagsToAdd: Tag[] = [];

                article.tags.forEach((tag: any) => {
                  const tagName = typeof tag === 'object' ? tag.name : tag;
                  const tagId = typeof tag === 'object' ? tag.id : undefined;

                  // 在 allTags 中查找
                  const existingTag = prevTags.find(
                    (t) => t.name.toLowerCase() === tagName.toLowerCase()
                  );

                  if (existingTag) {
                    // 找到了，使用它的 ID
                    selectedTagIds.push(existingTag.id);
                  } else if (tagId) {
                    // API 返回了 ID，使用它
                    selectedTagIds.push(tagId);
                    newTagsToAdd.push({ id: tagId, name: tagName });
                  } else {
                    // 没有 ID，创建新的（用 tagName 作为临时 ID）
                    const tempId = `tag_${tagName}`.hashCode?.() || tagName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                    selectedTagIds.push(tempId);
                    newTagsToAdd.push({ id: tempId, name: tagName });
                  }
                });

                setSelectedTags(selectedTagIds);
                return [...prevTags, ...newTagsToAdd];
              });
            }
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  // ---------------------- 实时搜索标签（客户端 + 服务端） ----------------------
  const handleTagInputChange = async (value: string) => {
    setTagInput(value);

    if (!value.trim()) {
      setTagSuggestions([]);
      setShowTagDropdown(false);
      return;
    }

    const trimmedValue = value.trim().toLowerCase();

    // 1️⃣ 先从内存中的 allTags 搜索（前缀匹配 + 模糊匹配）
    const filtered = allTags.filter((tag) => {
      const tagNameLower = tag.name.toLowerCase();
      // 前缀匹配或包含匹配
      return (
        tagNameLower.startsWith(trimmedValue) ||
        tagNameLower.includes(trimmedValue)
      );
    });

    // 去掉已选中的标签
    const suggestions = filtered.filter(
      (t) => !selectedTags.includes(t.id)
    );

    setTagSuggestions(suggestions);
    setShowTagDropdown(true);

    // 2️⃣ 同时从服务端搜索（异步，更新到 allTags）
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/tags?search=${encodeURIComponent(trimmedValue)}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();

        if (result.success && result.data) {
          // 合并服务端返回的标签到 allTags
          setAllTags((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newTags = result.data.filter(
              (t: Tag) => !existingIds.has(t.id)
            );
            return [...prev, ...newTags];
          });

          // 重新过滤建议
          const combined = [
            ...allTags,
            ...result.data.filter(
              (t: Tag) => !allTags.some((existing) => existing.id === t.id)
            ),
          ];

          const refilteredSuggestions = combined.filter((tag) => {
            const tagNameLower = tag.name.toLowerCase();
            return (
              (tagNameLower.startsWith(trimmedValue) ||
                tagNameLower.includes(trimmedValue)) &&
              !selectedTags.includes(tag.id)
            );
          });

          setTagSuggestions(refilteredSuggestions);
        }
      } catch (err) {
        console.error("Tag search error:", err);
      }
    }
  };

  // ---------------------- 选择标签 ----------------------
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.includes(tag.id)) {
      setSelectedTags([...selectedTags, tag.id]);
    }
    setTagInput("");
    setTagSuggestions([]);
    setShowTagDropdown(false);
    setDropdownLocked(false);
  };

  // ---------------------- 创建新标签 ----------------------
  const handleCreateNewTag = async () => {
    const name = tagInput.trim();
    if (!name) {
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
        body: JSON.stringify({ name }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to create tag");
      }

      // 从响应中获取新标签的 ID
      const newTagId = result.data?.id || result.tag?.id || Date.now();
      const newTag: Tag = {
        id: newTagId,
        name,
      };

      // ✅ 立即添加到 allTags 和 selectedTags
      setAllTags((prev) => [...prev, newTag]);
      setSelectedTags((prev) => [...prev, newTag.id]);

      setTagInput("");
      setTagSuggestions([]);
      setShowTagDropdown(false);
      toast.success(`Tag "${name}" created successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create tag.");
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        handleTagSelect(tagSuggestions[0]);
      } else {
        handleCreateNewTag();
      }
    } else if (e.key === ",") {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        handleTagSelect(tagSuggestions[0]);
      } else {
        handleCreateNewTag();
      }
    }
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter((id) => id !== tagId));
  };

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
      if (!result.success)
        throw new Error(result.message || "Failed to add category");

      toast.success(`Category "${name.trim()}" added successfully!`);
      const newCatObj = { id: result.data?.id || Date.now(), name: name.trim() };
      
      // ✅ 立即添加到 categories 和设置为当前选择
      setCategories((prev) => [...prev, newCatObj]);
      setCategoryId(newCatObj.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category.");
    }
  };

  // ---------------------- 保存文章 ----------------------
  const handleSave = async () => {
    if (!title || !content)
      return toast.warning("Title and content are required.");

    const token = localStorage.getItem("token");
    if (!token) return;

    const selectedTagNames = allTags
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
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
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
            <p>
              {id
                ? "Update your existing article"
                : "Write and publish a new article"}
            </p>
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
                    {allTags
                      .filter((tag) => selectedTags.includes(tag.id))
                      .map((tag) => (
                        <span key={tag.id} className="tag-chip">
                          {tag.name}
                          <button
                            className="remove-tag"
                            onClick={() => removeTag(tag.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>

                  <div className="tag-input-wrapper">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => handleTagInputChange(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={() =>
                        tagInput &&
                        tagSuggestions.length > 0 &&
                        setShowTagDropdown(true)
                      }
                      onBlur={() => {
                        if (!dropdownLocked) {
                          setShowTagDropdown(false);
                        }
                      }}
                      placeholder="Type tag name (press Enter or comma)"
                      className="form-input"
                    />

                    {showTagDropdown && tagInput && (
                      <div
                        className="tag-dropdown"
                        onMouseDown={() => setDropdownLocked(true)}
                        onMouseUp={() => setDropdownLocked(false)}
                      >
                        {tagSuggestions.length > 0 ? (
                          <>
                            <div className="tag-suggestions">
                              {tagSuggestions.map((tag) => (
                                <div
                                  key={tag.id}
                                  className="tag-suggestion-item"
                                  onClick={() => handleTagSelect(tag)}
                                >
                                  {tag.name}
                                </div>
                              ))}
                            </div>
                            <div className="tag-divider"></div>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="tag-create-btn"
                          onClick={handleCreateNewTag}
                        >
                          + Create "{tagInput}"
                        </button>
                      </div>
                    )}
                  </div>
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
                    previewOptions={{
                      remarkPlugins: [remarkGfm, remarkGemoji],
                    }}
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