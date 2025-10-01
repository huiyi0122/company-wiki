// src/components/Docs.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MDEditor from "@uiw/react-md-editor";

// Import the values (things that exist at runtime)
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";

// Import the types (things that disappear after compilation)
import type { User, DocItem } from "./CommonTypes";
import "../styles/Docs.css"; // 可以包含一些Docs页面特有的布局和卡片样式

interface DocsProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Docs({ currentUser, setCurrentUser }: DocsProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const navigate = useNavigate();

  const fetchDocs = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: DocItem[]) => setDocs(data))
      .catch((err) => console.error("Fetch articles error:", err));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Are you sure to delete this document?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Deleted!");
      fetchDocs();
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  const filteredDocs = docs.filter(
    (d) =>
      (category === "" || d.category === category) &&
      (d.content.toLowerCase().includes(search.toLowerCase()) ||
        d.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="layout">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
      <div className="main-content-with-sidebar">
        <input
          type="text"
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        {filteredDocs.length === 0 && <p style={{ marginLeft: "50px" }}>No documents found.</p>}
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="doc-card">
            <h3>{doc.title || "Untitled"}</h3>
            <MDEditor.Markdown source={doc.content.substring(0, 50) + "..."} />
            <p>Category: {doc.category}</p>
            <p>Author: {doc.author || "Unknown"}</p>

            <div className="doc-buttons">
              {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
                <button
                  className="edit"
                  onClick={() => navigate(`/editor/${doc.id}`)}
                >
                  Edit
                </button>
              )}
              {currentUser &&
                (currentUser.role === "admin" ||
                  (currentUser.role === "editor" &&
                    doc.author === currentUser.username)) && (
                  <button
                    className="delete"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </button>
                )}
              <button
                className="view"
                onClick={() => navigate(`/docs/${doc.id}`)}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}