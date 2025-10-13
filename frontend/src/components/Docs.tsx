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
  const [totalResults, setTotalResults] = useState<number>(0);
  const [pageSize] = useState<number>(5);

  const navigate = useNavigate();
  const location = useLocation();

  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [prevCursors, setPrevCursors] = useState<number[]>([]);


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
      }
    } catch (err) {
      console.error("❌ Error loading categories:", err);
    }
  };

  // 📡 Fetch articles using Elasticsearch
  const fetchDocs = async () => {

  const token = localStorage.getItem("token");

  if (!token) {

    setError("User not logged in.");

    return;

  }
 
  setLoading(true);

  setError(null);
 
  try {

    const params = new URLSearchParams();

    params.append("page", currentPage.toString());

    params.append("limit", pageSize.toString());
 
    // 搜索关键词

    if (search.trim()) {

      if (search.startsWith("#")) {

        params.append("tags", search.substring(1).trim());

      } else {

        params.append("q", search.trim());

      }

    }
 
    // 分类筛选

    if (category) {

      params.append("category_id", category);

    }
 
    // 🔥 决定使用哪个接口

    const hasFilters = search.trim() || category;

    const endpoint = hasFilters ? "/articles/search" : "/articles";

    const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;

    console.log(`${hasFilters ? "🔍 Searching" : "📋 Fetching"}:`, url);
 
    const res = await fetch(url, {

      headers: { Authorization: `Bearer ${token}` },

    });
 
    if (!res.ok) throw new Error(`Failed to fetch articles (${res.status})`);
 
    const result = await res.json();

    console.log("📊 Result:", result);
 
    if (result.success && result.data) {

      let articles = result.data;
 
      // "My Articles" 筛选

      if (activeTab === "my" && currentUser) {

        articles = articles.filter(

          (doc: any) => doc.author_id === currentUser.id

        );

      }
 
      setDocs(articles);
 
      const total = result.meta?.total || 0;

      setTotalResults(total);

      setTotalPages(Math.ceil(total / pageSize));

    } else {

      setDocs([]);

      setTotalResults(0);

      setTotalPages(1);

    }

  } catch (err: any) {

    console.error("❌ Fetch error:", err);

    setError(err.message || "Failed to load documents.");

    setDocs([]);

  } finally {

    setLoading(false);

  }

};
 

  // 🏁 Init category map
  useEffect(() => {
    fetchCategories();
  }, []);

  // 🔁 从 URL 读取分类参数
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category_id") || "";
    const searchQuery = params.get("q") || "";
    
    setCategory(cat);
    if (searchQuery) {
      setSearch(searchQuery);
    }
  }, [location.search]);

  // 🔁 当筛选条件变化时，重置到第一页并重新搜索
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, activeTab]);

  // 🔁 执行搜索
  useEffect(() => {
    if (Object.keys(categoryMap).length > 0) {
      fetchDocs();
    }
  }, [currentPage, search, category, activeTab, categoryMap]);

  // 🔄 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
              placeholder="Search articles... (Use # for tags, e.g., #test)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                style={{ marginLeft: "10px" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Display */}
          {category && (
            <div className="active-filters">
              <span>Category: {categoryMap[parseInt(category)] || category}</span>
              <button onClick={() => setCategory("")}>✕</button>
            </div>
          )}

          {/* Tabs Section */}
          {currentUser && currentUser.role !== "viewer" && (
            <div className="tabs-section">
              <div className="tabs-container">
                <button
                  className={`tab-button ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  All Articles
                </button>
                <button
                  className={`tab-button ${activeTab === "my" ? "active" : ""}`}
                  onClick={() => setActiveTab("my")}
                >
                  My Articles
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          {!loading && !error && (
            <div className="results-info">
              <p>Found {totalResults} article(s)</p>
            </div>
          )}

          {/* Content Section */}
          <div className="content-section">
            {/* Loading State */}
            {loading && (
              <div className="loading-state">
                <p>Loading articles...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="error-state">
                <p>❌ {error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && docs.length === 0 && (
              <div className="empty-state">
                <p>📭 No articles found.</p>
                {(search || category) && (
                  <button onClick={() => { setSearch(""); setCategory(""); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

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
                          {categoryMap[doc.category_id] || "Uncategorized"}
                        </span>
                      </div>
                    </div>

                    <div className="article-content">
                      <p className="article-author">
                        By {doc.author || `User ${doc.author_id}` || "Unknown"}
                      </p>

                      {/* Tags */}
                      {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                        <div className="article-tags">
                          {doc.tags.map((tag: any, idx: number) => (
                            <span key={idx} className="tag-pill-sm">
                              {typeof tag === "string" ? tag : tag.name || tag}
                            </span>
                          ))}
                        </div>
                      )}

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

            {/* Pagination */}
            {!loading && !error && docs.length > 0 && totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}