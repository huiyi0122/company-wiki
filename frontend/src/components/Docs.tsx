// src/components/Docs.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

// Import the values (things that exist at runtime)
import { API_BASE_URL } from "./CommonTypes";

// Import the types (things that disappear after compilation)
import type { User, DocItem } from "./CommonTypes";
import "../styles/Docs.css"; 

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
        {filteredDocs.length === 0 && (
          <p style={{ marginLeft: "50px" }}>No documents found.</p>
        )}
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="doc-card cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate(`/docs/${doc.id}`)}
          >
            <h3>Title: {doc.title || "Untitled"}</h3>
            <p>Category: {doc.category}</p>
            <p>
            <p>
              {`${doc.role || currentUser?.role || "viewer"}: ${doc.author || currentUser?.username || "Unknown"}`}
            </p>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
