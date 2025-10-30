import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import type { User, DocItem } from "./CommonTypes";
import { apiFetch } from "../utils/api";
import "../styles/Docs.css";

interface DocsProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Docs({ currentUser, setCurrentUser }: DocsProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [pageSize] = useState(5);
  const navigate = useNavigate();
  const location = useLocation();
    
  const searchParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      search: params.get("q") || "",
      category: params.get("category_id") || "",
    };
  }, [location.search]);

  // 在渲染前就检查 token（同步执行）
  const token = localStorage.getItem("accessToken");
  if (!token) navigate("/login");

  // 加载分类（只执行一次）
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiFetch("/categories");
        if (res.status === 401) {
          navigate("/login");
          return;
        }

        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const map: Record<number, string> = {};
          result.data.forEach((c: any) => (map[c.id] = c.name));
          setCategoryMap(map);
        } else {
          console.error("Unexpected category response:", result);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    loadCategories();
  }, [navigate]);

  // ✅ fetchDocs（只在需要时被手动调用）
  const fetchDocs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("limit", pageSize.toString());
        params.append("page", page.toString());

        // ✅ 传入搜索关键词（来自 Sidebar）
        if (searchParams.search.trim()) {
          params.append("q", searchParams.search.trim());
        }

        // ✅ 如果有分类，也传入
        if (searchParams.category) {
          params.append("category_id", searchParams.category);
        }

        // ✅ “我的文章”模式下加上 author_id
        if (activeTab === "my" && currentUser?.id) {
          params.append("author_id", currentUser.id.toString());
        }

        // ✅ 判断要用哪个 endpoint
        const hasFilters =
          searchParams.search.trim() || searchParams.category || activeTab === "my";
        const endpoint = hasFilters ? "/articles/search" : "/articles";

        const url = `${endpoint}?${params.toString()}`;

        const res = await apiFetch(url);
        if (!res.ok) {
          if (res.status === 401) {
            navigate("/login");
            return;
          }
          throw new Error(`Failed to fetch articles (${res.status})`);
        }

        const result = await res.json();
        setDocs(result.data || []);
        setTotalResults(result.meta?.total || 0);
        setTotalPages(result.meta?.totalPages || 1);
        setCurrentPage(page);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, activeTab, currentUser, searchParams, navigate]
  );


  // 仅当 categoryMap 加载完成或参数变化时加载文档
  //   useEffect(() => {
  //   if (Object.keys(categoryMap).length > 0) {
  //     fetchDocs(1);
  //   }
  // }, [categoryMap, fetchDocs, activeTab]);

  // 搜索或分类变化时也应该触发搜索
  useEffect(() => {
    if (Object.keys(categoryMap).length > 0) {
      fetchDocs(1);
    }
  }, [categoryMap, searchParams.search, searchParams.category, activeTab]);
  // 添加 searchParams.search 和 searchParams.category 作为依赖


  // ✅ 分页处理
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      fetchDocs(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ✅ 分页 UI 渲染
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
        setCategory={(cat) => navigate(`/docs?category_id=${cat}`)}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="docs-page">
          <div className="page-header">
            <h1>Knowledge Base</h1>
            <p>Browse and search through all articles</p>
          </div>

          {currentUser && currentUser.role !== "viewer" && (
            <div className="tabs-section">
              <div className="tabs-container">
                <button
                  className={`tab-button ${activeTab === "all" ? "active" : ""
                    }`}
                  onClick={() => setActiveTab("all")}
                >
                  All Articles
                </button>
                <button
                  className={`tab-button ${activeTab === "my" ? "active" : ""
                    }`}
                  onClick={() => setActiveTab("my")}
                >
                  My Articles
                </button>
              </div>
            </div>
          )}

          <div className="results-info">
            <p>
              {loading
                ? "Loading..."
                : `Showing ${docs.length} of ${totalResults} articles (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>

          <div className="content-section">
            {/* {loading && <p>Loading articles...</p>} */}
            {error && <p>❌ {error}</p>}

            {!loading && !error && docs.length === 0 && (
              <div className="empty-state">
                <p>📭 No articles found.</p>
                <button onClick={() => navigate("/docs")}>Clear filters</button>
              </div>
            )}

            {!error && docs.length > 0 && (
              <>
                <div className="articles-grid">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="article-card"
                      onClick={() => navigate(`/docs/${doc.id}`)}
                    >
                      <h3 className="article-title">{doc.title || "Untitled"}</h3>
                      <div className="article-meta">
                        <span className="category-badge">
                          {categoryMap[doc.category_id] || "Uncategorized"}
                        </span>
                      </div>
                      <p className="article-author">
                        By{" "}
                        {doc.author_name ||
                          doc.created_by_name ||
                          `User ${doc.author_id}` ||
                          "Unknown"}
                      </p>

                      <p className="article-date">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
