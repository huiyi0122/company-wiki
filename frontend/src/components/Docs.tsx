import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/Docs.css";

// --- 🚀 useDebounce Hook 实现 (保持不变) ---
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
// ---------------------------------

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

  // 📦 游标分页状态 (Load More 模式)
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [pageSize] = useState<number>(5);

  // ❌ 移除 isNewSearch，它导致了依赖循环和不必要的重置。

  const navigate = useNavigate();
  const location = useLocation();

  // 🚀 防抖后的搜索值
  const debouncedSearch = useDebounce(search, 500);

  // 📦 Load category map ( unchanged )
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

  /**
   * 📡 Fetch articles using Load More (Cursor-based or Page-based)
   * @param cursorToUse 要用于请求的游标值/页码 (null for the first page / new search)
   */
  const fetchDocs = useCallback(async (cursorToUse: number | null) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("User not logged in.");
      return;
    }

    // 只有在加载第一页/新筛选时才显示完全的 loading spinner
    if (cursorToUse === null) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("limit", pageSize.toString());

      // 使用 debouncedSearch 来判断是否进入搜索模式
      const hasFilters = debouncedSearch.trim() || category;

      let endpoint: string;
      let nextCursorVal: number | null = null;
      let articles: any[] = [];
      let totalVal: number = 0;

      // ✅ Decide the API endpoint and pagination parameter
      if (hasFilters) {
        // --- 搜索模式用 cursor 分页 ---
        endpoint = "/articles/search";
        if (cursorToUse !== null) {
          params.append("cursor", cursorToUse.toString());
        }

        if (debouncedSearch.trim()) {
          if (debouncedSearch.startsWith("#")) {
            params.append("tags", debouncedSearch.substring(1).trim());
          } else {
            params.append("q", debouncedSearch.trim());
          }
        }
        if (category) {
          params.append("category_id", category);
        }
      } else {
        // --- 普通模式用 page 分页 ---
        endpoint = "/articles";
        const pageToFetch = cursorToUse !== null ? cursorToUse : 1;
        params.append("page", pageToFetch.toString());
        
        if (activeTab === "my" && currentUser?.id) {
            params.append("author_id", currentUser.id.toString());
        }
      }

      const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
      console.log(`📡 Fetching (${hasFilters ? "search" : "normal"}):`, url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch articles (${res.status})`);
      const result = await res.json();

      // 🚀 Process result based on mode
      if (hasFilters) {
        articles = result.data || [];
        nextCursorVal = result.meta?.nextCursor || null;
        totalVal = result.meta?.total || articles.length;
      } else {
        articles = result.data || [];
        const currentPage = result.meta?.page || 1;
        const totalPages = result.meta?.totalPages || 1;
        totalVal = result.meta?.total || articles.length;
        nextCursorVal = currentPage < totalPages ? currentPage + 1 : null; 
      }

      // 🚀 Update UI data
      if (cursorToUse === null) {
        // 新搜索/筛选/第一页：替换数据
        setDocs(articles);
      } else {
        // 加载更多：追加数据
        setDocs(prev => [...prev, ...articles]);
      }

      setNextCursor(nextCursorVal);
      setTotalResults(totalVal);
      // ❌ 移除 setIsNewSearch(false);
      
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, activeTab, currentUser, pageSize]); // ⚠️ 依赖数组中不再包含 isNewSearch

  // 🏁 Init category map
  useEffect(() => {
    fetchCategories();
  }, []);

  // 🔁 从 URL 读取分类参数 (unchanged)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category_id") || "";
    const searchQuery = params.get("q") || "";

    setCategory(cat);
    if (searchQuery) {
      setSearch(searchQuery);
    }
  }, [location.search]);

  // 🔁 当筛选条件变化时，重置游标并重新搜索
  useEffect(() => {
    // ⚠️ 核心：这里只依赖 debouncedSearch, category, activeTab。
    // fetchDocs 已经稳定，不会因为 fetchDocs 自身重新创建而触发。
    if (Object.keys(categoryMap).length > 0 || debouncedSearch || category || activeTab) {
      // ❌ 移除 setIsNewSearch(true);
      setNextCursor(null);

      // 立即请求第一页 (null 游标/页码)
      fetchDocs(null);
    }
  }, [debouncedSearch, category, activeTab, categoryMap, fetchDocs]);

  // 🔄 处理“加载更多” (保持不变)
  const handleLoadMore = () => {
    if (nextCursor !== null && !loading) {
      fetchDocs(nextCursor);
    }
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
          <div className="results-info">
            <p>
              {loading && docs.length === 0
                ? 'Loading...'
                : `Showing ${docs.length} of ${totalResults} articles${nextCursor !== null && docs.length < totalResults ? ' (scroll to load more)' : ''}`
              }
            </p>
          </div>

          {/* Content Section */}
          <div className="content-section">
            {/* Loading State */}
            {loading && docs.length === 0 && (
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
            {!error && docs.length > 0 && (
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
                        By {doc.author || doc.created_by_name || `User ${doc.author_id}` || "Unknown"}
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

            {/* Loading More Indicator */}
            {loading && docs.length > 0 && (
                <div style={{textAlign: "center", padding: "10px", color: "#666"}}>
                    Loading more...
                </div>
            )}
            
            {/* Load More Button (Cursor/Page-based) */}
            {nextCursor !== null && !loading && (
              <div className="pagination">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="load-more-button"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}