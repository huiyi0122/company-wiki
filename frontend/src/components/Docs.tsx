import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
import type { User, DocItem } from "./CommonTypes";
import "../styles/Docs.css";

// ====================== ✅ 加在最上面：fetchWithAuth 实现 ======================
async function fetchWithAuth(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  // ✅ 先带上 access token 发请求
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // ✅ 如果 access token 过期（401）
  if (response.status === 401 && refreshToken) {
    try {
      console.log("🔁 Access token expired, trying refresh...");

      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) throw new Error("Failed to refresh token");

      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.accessToken;

      if (newAccessToken) {
        // ✅ 更新 localStorage
        localStorage.setItem("token", newAccessToken);

        // ✅ 再重试原本的请求
        const retryResponse = await fetch(input, {
          ...init,
          credentials: "include",
          headers: {
            ...(init?.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
            "Content-Type": "application/json",
          },
        });

        return retryResponse;
      } else {
        throw new Error("No new access token received");
      }
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      // ❌ refresh token 也失效，强制登出
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      throw err;
    }
  }

  return response;
}
// ============================================================================

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
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [pageSize] = useState<number>(5);

  const navigate = useNavigate();
  const location = useLocation();

  // 📦 加载分类映射（✅ 改成 fetchWithAuth）
  const fetchCategories = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/categories`);
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

  // 📡 获取文章（✅ 改成 fetchWithAuth）
  const fetchDocs = useCallback(
    async (page: number, searchQuery: string, categoryId: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append("limit", pageSize.toString());
        const hasFilters = searchQuery.trim() || categoryId;

        let endpoint: string;
        if (hasFilters) {
          endpoint = "/articles/search";
          params.append("page", page.toString());
          if (searchQuery.trim()) {
            if (searchQuery.startsWith("#")) {
              params.append("tags", searchQuery.substring(1).trim());
            } else {
              params.append("q", searchQuery.trim());
            }
          }
          if (categoryId) {
            params.append("category_id", categoryId);
          }
        } else {
          endpoint = "/articles";
          params.append("page", page.toString());
          if (activeTab === "my" && currentUser?.id) {
            params.append("author_id", currentUser.id.toString());
          }
        }

        const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
        console.log(`📡 Fetching (page ${page}):`, url);

        const res = await fetchWithAuth(url);
        if (!res.ok)
          throw new Error(`Failed to fetch articles (${res.status})`);

        const result = await res.json();
        const articles = result.data || [];
        const totalVal = result.meta?.total || articles.length;
        const pagesVal = result.meta?.totalPages || 1;

        setDocs(articles);
        setTotalResults(totalVal);
        setTotalPages(pagesVal);
        setCurrentPage(page);
      } catch (err: any) {
        console.error("❌ Fetch error:", err);
        setError(err.message || "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, currentUser, pageSize]
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category_id") || "";
    const searchQuery = params.get("q") || "";
    setCategory(cat);
    setSearch(searchQuery);
  }, [location.search]);

  useEffect(() => {
    if (Object.keys(categoryMap).length > 0) {
      setCurrentPage(1);
      fetchDocs(1, search, category);
    }
  }, [search, category, activeTab, categoryMap, fetchDocs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      fetchDocs(newPage, search, category);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (currentPage <= 3) {
      pageNumbers.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pageNumbers.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="pagination-btn"
        >
          ← Previous
        </button>

        <div className="page-numbers">
          {pageNumbers.map((num, idx) => {
            if (num === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  ...
                </span>
              );
            }
            return (
              <button
                key={num}
                onClick={() => handlePageChange(num as number)}
                disabled={loading}
                className={`page-number ${currentPage === num ? "active" : ""}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="pagination-btn"
        >
          Next →
        </button>
      </div>
    );
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

          {/* Category Filter Display */}
          {category && (
            <div className="active-filters">
              <span>
                Category: {categoryMap[parseInt(category)] || category}
              </span>
              <button onClick={() => setCategory("")}>✕</button>
            </div>
          )}

          {/* Tabs Section */}
          {currentUser && currentUser.role !== "viewer" && (
            <div className="tabs-section">
              <div className="tabs-container">
                <button
                  className={`tab-button ${
                    activeTab === "all" ? "active" : ""
                  }`}
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
              {loading
                ? "Loading..."
                : `Showing ${docs.length} of ${totalResults} articles (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>

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
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("");
                      navigate("/docs");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Articles List */}
            {!error && docs.length > 0 && (
              <>
                <div className="articles-grid">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="article-card"
                      onClick={() => navigate(`/docs/${doc.id}`)}
                    >
                      <div className="article-header">
                        <h3 className="article-title">
                          {doc.title || "Untitled"}
                        </h3>
                        <div className="article-meta">
                          <span className="category-badge">
                            {categoryMap[doc.category_id] || "Uncategorized"}
                          </span>
                        </div>
                      </div>

                      <div className="article-content">
                        <p className="article-author">
                          By{" "}
                          {doc.author ||
                            doc.created_by_name ||
                            `User ${doc.author_id}` ||
                            "Unknown"}
                        </p>

                        {/* Tags */}
                        {doc.tags &&
                          Array.isArray(doc.tags) &&
                          doc.tags.length > 0 && (
                            <div className="article-tags">
                              {doc.tags.map((tag: any, idx: number) => (
                                <span key={idx} className="tag-pill-sm">
                                  {typeof tag === "string"
                                    ? tag
                                    : tag.name || tag}
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

                {/* Page-based Pagination */}
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
