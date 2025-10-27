import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import type { User } from "./CommonTypes";
import { apiFetch } from "../utils/api";
import Modal from "./Modal"; // 假设 Modal 组件已导入
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

interface Article {
  id: number;
  title: string;
  content: string;
  category_id?: number;
  tags: Tag[];
}

// 假设 ModalProps 接口来自 Modal 组件的定义，用于状态管理
interface ModalState {
  isOpen: boolean;
  title: string;
  content: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  inputType?: "text" | "none";
  inputValue?: string;
  targetId?: number;
  targetName?: string;
}

export default function EditorPage({
  currentUser,
  setCurrentUser,
}: EditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("## Start writing your article...");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [dropdownLocked, setDropdownLocked] = useState(false);

  const [debouncedTagInput, setDebouncedTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ---------------------- Modal State for Category ----------------------
  const modalInputRef = useRef("");

  const [modalState, setModalState] = useState<ModalState>({
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
    });
    modalInputRef.current = "";
  };

  // ---------------------- 初始化加载 (保留不变) ----------------------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const catRes = await apiFetch("/categories");
        const catData = await catRes.json();
        if (catData.success && Array.isArray(catData.data)) {
          setCategories(catData.data);
        }

        if (id) {
          const artRes = await apiFetch(`/articles/${id}`);
          const artData = await artRes.json();
          if (artData.success && artData.data) {
            const article: Article = artData.data; // <-- 给出类型
            setTitle(article.title);
            setContent(article.content);
            setCategoryId(article.category_id || null);

            if (Array.isArray(article.tags)) {
              const tagObjs = article.tags.map((t) => ({
                id: t.id,
                name: t.name || String(t),
              }));
              setAllTags(tagObjs);
              setSelectedTags(tagObjs.map((t) => t.id));
            }
          }

        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load editor data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // ---------------------- 输入防抖 (保留不变) ----------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTagInput(tagInput.trim());
    }, 1000);
    return () => clearTimeout(timer);
  }, [tagInput]);

  // ---------------------- ES 搜索标签 (保留不变) ----------------------
  useEffect(() => {
    if (!debouncedTagInput) {
      setTagSuggestions([]);
      setShowTagDropdown(false);
      return;
    }

    const searchTags = async () => {
      try {
        const res = await apiFetch(
          `/tags?search=${encodeURIComponent(debouncedTagInput)}&limit=20`
        );
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          const filtered = result.data.filter(
            (tag: Tag) => !selectedTags.includes(tag.id)
          );
          setTagSuggestions(filtered);
          setShowTagDropdown(true);
        } else {
          setTagSuggestions([]);
        }
      } catch (err) {
        console.error("Tag search (ES) error:", err);
        setTagSuggestions([]);
      }
    };

    searchTags();
  }, [debouncedTagInput, selectedTags]);

  // ---------------------- 标签交互 (保留不变) ----------------------

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
  };

  const handleTagSelect = (tag: Tag) => {
    if (selectedTags.includes(tag.id)) return;

    setSelectedTags((prev) => [...prev, tag.id]);
    setAllTags((prev) => {
      if (!prev.some((t) => t.id === tag.id)) {
        return [...prev, tag];
      }
      return prev;
    });
    setTagInput("");
    setTagSuggestions([]);
    setShowTagDropdown(false);
  };

  const handleCreateNewTag = async () => {
    const name = tagInput.trim();
    if (!name) {
      toast.warning("Tag name cannot be empty.");
      return;
    }

    try {
      const res = await apiFetch("/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const result = await res.json();

      // ✅ 情况 1：后端创建成功
      if (result.success) {
        const newTag: Tag = result.data || { id: result.id || Date.now(), name };
        setAllTags((prev) => [...prev, newTag]);
        setSelectedTags((prev) => [...prev, newTag.id]);
        setTagInput("");
        setTagSuggestions([]);
        toast.success(`Tag "${name}" created successfully!`);
        return;
      }

      // ✅ 情况 2：后端返回「已存在」
      if (result.error === "Tag already exists") {
        const searchRes = await apiFetch(
          `/tags?search=${encodeURIComponent(name)}`
        );
        const searchData = await searchRes.json();

        if (searchData.success && searchData.data.length > 0) {
          const existingTag = searchData.data[0];
          handleTagSelect(existingTag);
          toast.info(`Tag "${name}" already exists, selected it.`);
          return;
        }

        toast.warning(`Tag "${name}" already exists but not found.`);
        return;
      }

      console.error("Unexpected tag creation response:", result);
      toast.error(result.error || "Failed to create tag.");
    } catch (err) {
      console.error("handleCreateNewTag error:", err);
      toast.error("Failed to create tag (network or server issue).");
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
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

  // ---------------------- 新增分类 (Refactored to use Modal) ----------------------
  const handleAddCategory = () => {
    modalInputRef.current = ""; // Reset ref
    
    setModalState({
      isOpen: true,
      title: "➕ Create New Category",
      content: (
        <>
          <p>Enter name for new category:</p>
        </>
      ),
      confirmText: "Create",
      inputType: "text",
      inputValue: "",
      onConfirm: async () => {
        const name = modalInputRef.current?.trim();

        if (!name) {
          toast.warning("Category name cannot be empty.");
          return;
        }
        
        closeModal(); // Close modal immediately before async operation

        try {
          const res = await apiFetch("/categories", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          const result = await res.json();

          if (result.success && (result.data || result.category)) {
            const newCat = result.data || result.category;
            setCategories((prev) => [...prev, newCat]);
            setCategoryId(newCat.id);
            toast.success(`Category "${name}" added successfully!`);
            return;
          }

          if (result.error === "Category already exists") {
            const searchRes = await apiFetch(
              `/categories?search=${encodeURIComponent(name)}`
            );
            const searchData = await searchRes.json();

            if (searchData.success && searchData.data.length > 0) {
              const existingCat = searchData.data[0];
              setCategoryId(existingCat.id);
              toast.info(`Category "${name}" already exists, selected it.`);
            } else {
              toast.warning(`Category "${name}" already exists but not found.`);
            }
            return;
          }

          console.error("Unexpected category creation response:", result);
          toast.error(result.error || "Failed to add category.");
        } catch (err) {
          console.error("handleAddCategory error:", err);
          toast.error("Failed to add category (network or server issue).");
        }
      },
    });
  };

  // ---------------------- 保存文章 (保留不变) ----------------------
  const handleSave = async () => {
    if (!title.trim() || !content.trim())
      return toast.warning("Title and content are required.");

    const selectedTagObjects = selectedTags.map((id) => {
      const found = allTags.find((t) => t.id === id);
      return found ? found.name : id;
    });

    const payload = {
      title,
      content,
      category_id: categoryId,
      tags: selectedTagObjects,
    };

    try {
      setLoading(true);
      const res = await apiFetch(id ? `/articles/${id}` : "/articles", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) throw new Error(result.message);
      toast.success("Article saved successfully!");
      navigate("/docs");
    } catch (err) {
      console.error(err);
      toast.error("Save failed!");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------- 渲染 ----------------------
  if (loading) {
    // ... loading state remains the same
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
                        tagInput && tagSuggestions.length > 0 && setShowTagDropdown(true)
                      }
                      onBlur={() => {
                        if (!dropdownLocked) setShowTagDropdown(false);
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
                        {tagSuggestions.length > 0 && (
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
                        )}
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
                  {loading ? "Saving..." : "Save Article"}
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
      
      {/* Modal for Category Creation/Editing (like TagsManagement) */}
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
              placeholder="Enter category name"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}