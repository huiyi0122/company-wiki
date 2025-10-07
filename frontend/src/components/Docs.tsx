import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [showMyArticles, setShowMyArticles] = useState<boolean>(false); // ✅ 新增
  const navigate = useNavigate();

  // 🧩 解析不同接口格式的结果
  const parseArticles = (result: any): DocItem[] => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.articles)) return result.data.articles;
    return [];
  };

  // 📦 加载分类映射
  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        const map: Record<number, string> = {};
        result.data.forEach((c: any) => (map[c.id] = c.name));
        setCategoryMap(map);
      } else {
        console.warn("⚠️ Failed to load categories:", result.message);
      }
    } catch (err) {
      console.error("❌ Error loading categories:", err);
    }
  };

  // 📡 获取文章列表
  const fetchDocs = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("User not logged in.");
      return;
    }

    setLoading(true);
    setError(null);

const params = new URLSearchParams();

// ✅ 如果输入是以 # 开头，就按 tag 搜索
if (search.startsWith("#")) {
  params.append("tags", search.substring(1)); // 去掉 "#"
} else if (search.trim()) {
  params.append("keyword", search.trim());
}

if (category) params.append("category_id", category);

    const url =
      search || category
        ? `${API_BASE_URL}/articles/search?${params.toString()}`
        : `${API_BASE_URL}/articles`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch articles (${res.status})`);

      const result = await res.json();
      let articles = parseArticles(result);

      // ✅ “My Articles” 模式只显示当前用户的文章
      if (showMyArticles && currentUser) {
        articles = articles.filter(
          (doc) => doc.author === currentUser.username
        );
      }

      setDocs(articles);
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载分类映射
  useEffect(() => {
    fetchCategories();
  }, []);

  // 当搜索、分类或模式变化时重新加载
  useEffect(() => {
    fetchDocs();
  }, [search, category, showMyArticles]);

  return (
    <div className="layout">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        {/* 🔘 Tabs 切换 */}
        {currentUser && currentUser.role !== "viewer" && (
          <div className="article-tabs">
            <div
              className={`tab-item ${!showMyArticles ? "active" : ""}`}
              onClick={() => setShowMyArticles(false)}
            >
              All Articles
            </div>
            <div
              className={`tab-item ${showMyArticles ? "active" : ""}`}
              onClick={() => setShowMyArticles(true)}
            >
              My Articles
            </div>
          </div>
        )}

        {/* 🔎 搜索框 */}
        <input
          type="text"
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        {/* 状态提示 */}
        {loading && <p style={{ marginLeft: "50px" }}>Loading...</p>}
        {error && (
          <p style={{ color: "red", marginLeft: "50px" }}>⚠️ {error}</p>
        )}
        {!loading && !error && docs.length === 0 && (
          <p style={{ marginLeft: "50px" }}>No documents found.</p>
        )}

        {/* 📚 文档列表 */}
        {!loading &&
          !error &&
          docs.map((doc) => (
            <div
              key={doc.id}
              className="doc-card cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate(`/docs/${doc.id}`)}
            >
              <h3>Title: {doc.title || "Untitled"}</h3>
              <p>
                Category:{" "}
                {categoryMap[doc.category_id] ||
                  doc.category ||
                  "Uncategorized"}
              </p>
              <p>Author: {doc.author || currentUser?.username || "Unknown"}</p>
              <p>
                Created:{" "}
                {doc.created_at
                  ? new Date(doc.created_at).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
