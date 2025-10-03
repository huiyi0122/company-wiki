import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";

import Sidebar from "./Sidebar";
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/DocDetail.css";

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
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    fetch(`${API_BASE_URL}/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: DocItem) => setDoc(data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!doc) return <p className="loading-message">Document not found ❌</p>;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure to delete this document?")) return;
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Deleted!");
      navigate("/docs");
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

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
            <strong>Category:</strong> {doc.category}
          </p>
          <p>
            <strong>Username:</strong>{" "}
            {doc.author || currentUser?.username || "Unknown"}
          </p>

          <div className="doc-buttons" style={{ marginBottom: "20px" }}>
            {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
              <button
                className="edit"
                onClick={() => navigate(`/editor/${id}`)}
              >
                Edit
              </button>
            )}
            {currentUser &&
              (currentUser.role === "admin" ||
                (currentUser.role === "editor" &&
                  doc.author === currentUser.username)) && (
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
