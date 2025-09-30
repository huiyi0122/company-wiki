import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { jwtDecode } from "jwt-decode";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

// ===== 类型定义 =====
type Role = "admin" | "editor" | "viewer";

interface User {
  id: number;
  username: string;
  role: Role;
}

interface JWTPayload {
  id: number;
  username: string;
  role: Role;
  exp: number;
}

interface DocItem {
  id?: number;
  title: string;
  content: string;
  category: string;
  author?: string;
}

// ===== 权限定义 =====
const PERMISSIONS: Record<Role, string[]> = {
  admin: ["deleteAll", "view", "addCategory", "edit", "save"],
  editor: ["edit", "save", "deleteOwn", "view"],
  viewer: ["view"],
};

// ===== 默认分类 =====
const DEFAULT_CATEGORIES = ["HR", "Tech", "Onboarding"];
function getCategories(): string[] {

    return DEFAULT_CATEGORIES;
}

// ===== Navbar =====
function Navbar({ currentUser, setCurrentUser }: { currentUser: User | null; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <nav>
      <div className="nav-left">
        <Link to="/">Company Wiki</Link>
        <Link to="/docs">Articles</Link>
        {currentUser && PERMISSIONS[currentUser.role].includes("edit") && <Link to="/editor">Add New Article</Link>}
      </div>
      <div className="nav-right">
        {currentUser ? (
          <>
            <span>{currentUser.username} ({currentUser.role})</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

// ===== Sidebar =====
function Sidebar({ setCategory }: { setCategory: React.Dispatch<React.SetStateAction<string>> }) {
  const [categories, setCategories] = useState<string[]>(getCategories());
  useEffect(() => setCategories(getCategories()), []);
  return (
    <aside className="sidebar">
      <h3>Categories</h3>
      <ul>
        <li onClick={() => setCategory("")}>All</li>
        {categories.map((cat) => (
          <li key={cat} onClick={() => setCategory(cat)}>{cat}</li>
        ))}
      </ul>
    </aside>
  );
}

// ===== Login 页面 =====
function Login({ setCurrentUser }: { setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) return alert("Please fill all fields!");

    try {
      const res = await fetch("http://192.168.0.11:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return alert("Invalid username or password!");
      const data = await res.json();
      localStorage.setItem("token", data.token);

      const decoded = jwtDecode<JWTPayload>(data.token);
      setCurrentUser({ id: decoded.id, username: decoded.username, role: decoded.role });
      navigate("/docs");
    } catch (err) {
      console.error(err);
      alert("Login failed!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}

// ===== Docs 列表页 =====
function Docs({ currentUser }: { currentUser: User | null }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://192.168.0.11:3000/articles", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: DocItem[]) => setDocs(data))
      .catch((err) => console.error("Fetch articles error:", err));
  }, []);

  const filteredDocs = docs.filter(
    (d) => (category === "" || d.category === category) && (d.content.toLowerCase().includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Are you sure to delete?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://192.168.0.11:3000/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDocs(docs.filter((d) => d.id !== id));
      alert("Article deleted!");
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  return (
    <div className="layout">
      <Sidebar setCategory={setCategory} />
      <div className="main-content">
        <input type="text" placeholder="Search docs..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        {filteredDocs.length === 0 && <p>No documents found.</p>}
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="doc-card">
            <h3>{doc.title || "Untitled"}</h3>
            <p>{doc.content.substring(0, 50)}...</p>
            <p>Category: {doc.category}</p>
            <p>Author: {doc.author || "Unknown"}</p>
            <div className="doc-buttons">
              {currentUser && PERMISSIONS[currentUser.role].includes("edit") && <button onClick={() => navigate(`/editor/${doc.id}`)}>Edit</button>}
              {currentUser && ((currentUser.role === "admin") || (currentUser.role === "editor" && doc.author === currentUser.username)) && (
                <button onClick={() => handleDelete(doc.id)}>Delete</button>
              )}
              <button onClick={() => navigate(`/docs/${doc.id}`)}>View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== DocDetail 页面 =====
function DocDetail({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`http://192.168.0.11:3000/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: DocItem) => setDoc(data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!doc) return <p>Document not found ❌</p>;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure to delete this document?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://192.168.0.11:3000/articles/${id}`, {
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

  const exportPDF = async () => {
  const element = document.getElementById("doc-content");
  if (!element) return alert("Cannot find content to export!");

  try {
    const canvas = await html2canvas(element, { scale: 2, scrollY: -window.scrollY });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${doc.title || "document"}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Export PDF failed!");
  }
};

  const exportWord = async () => {
    const lines = doc.content.split("\n");
    const children = [
      new Paragraph({ text: doc.title || "Untitled", heading: HeadingLevel.HEADING_1 }),
      ...lines.map((line) => new Paragraph(line)),
    ];
    const docx = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${doc.title || "document"}.docx`);
  };

  return (
    <div className="main-content">
      <h2>{doc.title}</h2>
      <p><strong>Category:</strong> {doc.category}</p>
      <p><strong>Author:</strong> {doc.author || "Unknown"}</p>

      <div className="doc-buttons" style={{ marginBottom: "20px" }}>
        {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
          <button onClick={() => navigate(`/editor/${id}`)}>Edit</button>
        )}
        {currentUser &&
          ((currentUser.role === "admin") || (currentUser.role === "editor" && doc.author === currentUser.username)) && (
            <button onClick={handleDelete}>Delete</button>
          )}
        <button onClick={exportPDF}>Export PDF</button>
        <button onClick={exportWord}>Export Word</button>
      </div>

        {/* 右侧：预览 */}
        <div className="mk-down" id="doc-content">
          <MDEditor.Markdown source={doc.content} />
        </div>
      </div>
    
  );
}


// ===== EditorPage 页面 =====
function EditorPage({ currentUser }: { currentUser: User | null }) {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("## Start writing your article...");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>(getCategories());
  const navigate = useNavigate();

  useEffect(() => {
    setCategories(getCategories());
    if (id) {
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch(`http://192.168.0.11:3000/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data: DocItem) => {
          setTitle(data.title);
          setContent(data.content);
          setCategory(data.category);
        })
        .catch((err) => console.error(err));
    } else {
      setCategory(getCategories()[0]);
    }
  }, [id]);

  const handleSave = async () => {
    if (!currentUser || !PERMISSIONS[currentUser.role].includes("save")) return alert("No permission to save!");
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload: DocItem = { title, content, category, author: currentUser.username };
    try {
      const res = await fetch(
        id ? `http://192.168.0.11:3000/articles/${id}` : "http://192.168.0.11:3000/articles",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      alert("Saved!");
      navigate("/docs");
    } catch (err) {
      console.error(err);
      alert("Save failed!");
    }
  };

  return (
    <div className="main-content">
      <h2>{id ? "Edit Article" : "New Article"}</h2>
      <label>Title:</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Category:</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
      </select>
      <div className="editor-container" style={{ display: "flex", gap: "20px" }}>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || "")}
          height={500}
          style={{ flex: 1 }}
        />
        <div className="md-editor" style={{ flex: 1, padding: "20px", background: "#fff", overflowY: "auto", border: "1px solid #ccc" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
      <button className="save" onClick={handleSave}>Save</button>
    </div>
  );
}

// ===== App 主入口 =====
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      if (decoded.exp * 1000 > Date.now()) setCurrentUser({ id: decoded.id, username: decoded.username, role: decoded.role });
      else localStorage.removeItem("token");
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  return (
    <Router>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <Routes>
        <Route path="/" element={<Navigate to="/docs" replace />} />
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        <Route path="/docs" element={<Docs currentUser={currentUser} />} />
        <Route path="/docs/:id" element={<DocDetail currentUser={currentUser} />} />
        <Route path="/editor" element={<EditorPage currentUser={currentUser} />} />
        <Route path="/editor/:id" element={<EditorPage currentUser={currentUser} />} />
      </Routes>
    </Router>
  );
}
