import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

  // Tab state
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(5); 

  const navigate = useNavigate();
  const location = useLocation();

  const parseArticles = (result: any): { articles: DocItem[]; total: number } => {
    // 适配你的 API 结构
    let articles: DocItem[] = [];
    if (Array.isArray(result?.data)) articles = result.data;
    else if (Array.isArray(result?.data?.articles)) articles = result.data.articles;
    
    // 假设后端返回 meta.total，如果没返回，这个分页计算是不准确的。
    const total = result.meta?.total || articles.length * totalPages;
    
    return { articles, total };
  };

  // 📦 Load category map
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

  // 📡 Fetch articles (Optimized for hypothetical backend pagination)
  const fetchDocs = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("User not logged in.");
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();

    params.append("page", currentPage.toString());
    params.append("limit", pageSize.toString());

    if (search.startsWith("#")) {
      params.append("tags", search.substring(1));
    } else if (search.trim()) {
      params.append("keyword", search.trim());
    }

    if (category) params.append("category_id", category);

    const url = `${API_BASE_URL}/articles?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch articles (${res.status})`);

      const result = await res.json();
      const { articles, total } = parseArticles(result);
      let filteredArticles = articles;

      // 仅在前端筛选 'My Articles'
      if (activeTab === "my" && currentUser) {
        filteredArticles = articles.filter(
          (doc) => doc.author_id === currentUser.id
        );
      }
      
      setTotalPages(Math.ceil(total / pageSize)); 

      // 仅设置当前页面数据
      setDocs(filteredArticles);
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  // 🏁 Init category map
  useEffect(() => {
    fetchCategories();
  }, []);

  // 🔁 Update category when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category_id") || "";
    setCategory(cat);
  }, [location.search]);

  // 🔁 Refetch when filters or category map change
  useEffect(() => {
    // 每次搜索/筛选变化时，重置到第一页
    setCurrentPage(1); 
    fetchDocs();
  }, [search, category, activeTab, categoryMap]); // **FIX: Added categoryMap dependency**
  
  // 🔁 Refetch when page changes
  useEffect(() => {
    fetchDocs();
  }, [currentPage]); 

  return (
    <div className="layout">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="docs-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>Knowledge Base</h1>
            <p>Browse and search through all articles</p>
          </div>

          {/* Search Bar */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); 
              }}
              className="search-input"
            />
          </div>

          {/* Tabs Section */}
          {currentUser && currentUser.role !== "viewer" && (
            <div className="tabs-section">
              <div className="tabs-container">
                <button
                  className={`tab-button ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("all");
                    setCurrentPage(1);
                  }}
                >
                  All Articles
                </button>
                <button
                  className={`tab-button ${activeTab === "my" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("my");
                    setCurrentPage(1);
                  }}
                >
                  My Articles
                </button>
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="content-section">
            {/* Loading State, Error State, Empty State (omitted for brevity) */}
            {loading && (<div className="loading-state">...</div>)}
            {error && (<div className="error-state">...</div>)}
            {!loading && !error && docs.length === 0 && (<div className="empty-state"><p>No articles found.</p></div>)}

            {/* Articles List */}
            {!loading && !error && docs.length > 0 && (
              <div className="articles-grid">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="article-card"
                    onClick={() => navigate(`/docs/${doc.id}`)}
                  >
                    <div className="article-header">
                      <h3 className="article-title">{doc.title || "Untitled"}</h3>
                      <div className="article-meta">
                        <span className="category-badge">
                          {/* FIX: categoryMap ensures category name is displayed if loaded */}
                          {categoryMap[doc.category_id] || doc.category || "Uncategorized"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="article-content">
                      <p className="article-author">
                        By {doc.author || "Unknown"}
                      </p>
                      
                      {/* **FIX: Added Tags rendering logic** */}
                      {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                        <div className="article-tags">
                            <strong>Tags:</strong> 
                            {doc.tags.map((t: any) => (
                                <span key={t.id || t} className="tag-pill-sm">
                                    {t.name || t}
                                </span>
                            ))}
                        </div>
                      )}
                      {/* **End of FIX** */}
                      
                      <p className="article-date">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination (omitted for brevity) */}
            {!loading && !error && docs.length > 0 && totalPages > 1 && (
                <div className="pagination">
                  {/* ... pagination buttons ... */}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}