import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import Sidebar from "./Sidebar";
import { PERMISSIONS, getCategories, API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/EditorPage.css";

interface EditorPageProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function EditorPage({
  currentUser,
  setCurrentUser,
}: EditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("## Start writing your article...");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>(getCategories());
  const navigate = useNavigate();

  useEffect(() => {
    setCategories(getCategories());
    if (id) {
      // 编辑模式：获取文章详情
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch(`${API_BASE_URL}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data: DocItem) => {
          setTitle(data.title);
          setContent(data.content);
          setCategory(data.category);
        })
        .catch((err) => console.error(err));
    } else {
      // 新增模式：重置状态
      setTitle("");
      setContent("## Start writing your article...");
      setCategory(getCategories()[0] || ""); // 默认选中第一个分类
    }
  }, [id]); // 监听 id 变化

  const handleSave = async () => {
  if (!currentUser || !PERMISSIONS[currentUser.role].includes("save")) {
    return alert("No permission to save!");
  }
  if (!title || !content) {
    return alert("Title and content are required.");
  }

  const token = localStorage.getItem("token");
  if (!token) return;

  // ✅ 只发 id、title、content
  const payload = id
    ? { id: Number(id), title, content }
    : { title, content };

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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Save failed: ${data.message || res.statusText}`);
    }

    alert("Article saved successfully!");
    navigate("/docs");
  } catch (err) {
    console.error(err);
    alert("Save failed! Check console for details.");
  }
};


    return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}} // EditorPage 不需要设置 Category
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <div className="edit-top">
          <h2>{id ? "Edit Article" : "New Article"}</h2>
          <div className="top">
            <div className="title">
              <label>Title:</label>
 
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
 
            <div className="Category">
              <label style={{ marginTop: "15px" }}>Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            className="editor-container"
            style={{ display: "flex", gap: "20px" }}
          >
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              height={500}
              style={{ flex: 1 }}
            />
          </div>
 
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
