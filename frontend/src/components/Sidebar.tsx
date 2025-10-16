import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PERMISSIONS, API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import "../styles/Sidebar.css";

interface SidebarProps {
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Category {
  id: number;
  name: string;
}

interface Article {
  id: number;
  title: string;
  category_id: number;
}

export default function Sidebar({ currentUser, setCurrentUser }: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [categoryArticles, setCategoryArticles] = useState<
    Record<number, Article[]>
  >({});
  const [loadingCategories, setLoadingCategories] = useState<number[]>([]);

  const [categoryPages, setCategoryPages] = useState<Record<number, number>>(
    {}
  );
  const [categoryTotals, setCategoryTotals] = useState<Record<number, number>>(
    {}
  );
  const [categoryHasMore, setCategoryHasMore] = useState<
    Record<number, boolean>
  >({});

  const navigate = useNavigate();
  const location = useLocation();

  const PAGE_SIZE = 8;

  // 🔍 防抖搜索
  useEffect(() => {
    const isDocsPage =
      location.pathname === "/docs" || location.pathname === "/";
    if (!isDocsPage) return;

    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        navigate(`/docs?q=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate("/docs");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm, navigate, location.pathname]);

  // 从URL同步搜索词
  useEffect(() => {
    const isDocsPage =
      location.pathname === "/docs" || location.pathname === "/";
    if (!isDocsPage) {
      if (searchTerm) setSearchTerm("");
      return;
    }

    const params = new URLSearchParams(location.search);
    const queryFromUrl = params.get("q") || "";
    if (queryFromUrl !== searchTerm) {
      setSearchTerm(queryFromUrl);
    }
  }, [location.search, location.pathname]);

  // 🔥 获取分类列表（带 refresh-token 自动续签）
  useEffect(() => {
    const fetchCategories = async () => {
      let response = await fetch(`${API_BASE_URL}/categories`, {
        credentials: "include", // ✅ 关键点
      });

      // 🔁 如果 access token 过期
      if (response.status === 401 || response.status === 403) {
        console.warn("Access token expired, trying to refresh...");

        const refreshResponse = await fetch(`${API_BASE_URL}/refresh-token`, {
          method: "POST",
          credentials: "include", // ✅ 自动附带 refreshToken cookie
        });

        if (!refreshResponse.ok) {
          console.error("Refresh token failed, please login again.");
          navigate("/login");
          return;
        }

        // ✅ 成功刷新后重试
        response = await fetch(`${API_BASE_URL}/categories`, {
          credentials: "include",
        });
      }

      const result = await response.json();
      if (result.success) {
        const list = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.data)
          ? result.data.data
          : [];
        setCategories(list.map((c: any) => ({ id: c.id, name: c.name })));
      }
    };

    fetchCategories();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setCurrentUser(null);
    navigate("/login");
    setMobileOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchTerm.trim()) {
        navigate(`/docs?q=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate("/docs");
      }
      setMobileOpen(false);
    }
  };

  const fetchCategoryArticles = async (
    categoryId: number,
    isLoadMore = false
  ) => {
    // ❌ 不再用 localStorage token
    // const accessToken = localStorage.getItem("accessToken");
    // if (!accessToken) return;

    setLoadingCategories((prev) => [...prev, categoryId]);

    try {
      const cursor = isLoadMore ? categoryPages[categoryId] : null;
      let url = `${API_BASE_URL}/articles/search?category_id=${categoryId}&limit=${PAGE_SIZE}`;
      if (cursor) url += `&cursor=${cursor}`;

      // ✅ 改成这样：只加 credentials
      let res = await fetch(url, {
        credentials: "include",
      });

      // ✅ 如果 access token 过期，自动 refresh 再重试一次
      if (res.status === 401 || res.status === 403) {
        console.warn("Access token expired, trying to refresh...");

        const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) {
          console.error("Refresh token failed, please login again.");
          navigate("/login");
          return;
        }

        // 🔁 刷新成功后再重试一次
        res = await fetch(url, {
          credentials: "include",
        });
      }

      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        const newArticles = result.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          category_id: a.category_id,
        }));

        setCategoryArticles((prev) => {
          const existing = isLoadMore ? prev[categoryId] || [] : [];
          const updated = [...existing, ...newArticles];
          return { ...prev, [categoryId]: updated };
        });

        const total = result.meta?.total || 0;
        const nextCursor = result.meta?.nextCursor || null;

        setCategoryTotals((prev) => ({ ...prev, [categoryId]: total }));
        setCategoryPages((prev) => ({ ...prev, [categoryId]: nextCursor }));
        setCategoryHasMore((prev) => ({ ...prev, [categoryId]: !!nextCursor }));
      }
    } catch (err) {
      console.error(`Error fetching articles for category ${categoryId}:`, err);
    } finally {
      setLoadingCategories((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const handleLoadMore = (categoryId: number) => {
    fetchCategoryArticles(categoryId, true);
  };

  const handleCategoryClick = (categoryId: number) => {
    const isExpanded = expandedCategories.includes(categoryId);
    if (isExpanded) {
      setExpandedCategories((prev) => prev.filter((id) => id !== categoryId));
    } else {
      setExpandedCategories((prev) => [...prev, categoryId]);
      if (!categoryArticles[categoryId]) {
        fetchCategoryArticles(categoryId, false);
      }
    }
  };

  const handleArticleClick = (articleId: number) => {
    navigate(`/docs/${articleId}`);
    setMobileOpen(false);
  };

  const isProfileActive = location.pathname === "/profile";
  const isDashboardActive = location.pathname === "/dashboard";
  const isNewArticleActive = location.pathname === "/editor";
  const isArticlesActive =
    location.pathname.startsWith("/docs") ||
    location.pathname === "/" ||
    (location.pathname.startsWith("/editor/") && !isNewArticleActive);
  const isEnrollActive = location.pathname === "/enroll";

  const renderMenuItems = () => (
    <>
      <div className="sidebar-search-form">
        <input
          type="text"
          placeholder="Search articles..."
          className="sidebar-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
        <li
          onClick={() => {
            navigate("/dashboard");
            setMobileOpen(false);
          }}
          className={isDashboardActive ? "active" : ""}
        >
          Dashboard
        </li>
      )}

      <li
        onClick={() => {
          navigate("/docs");
          setMobileOpen(false);
        }}
        className={isArticlesActive ? "active" : ""}
      >
        Articles
      </li>

      {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
        <li
          onClick={() => {
            navigate("/editor");
            setMobileOpen(false);
          }}
          className={isNewArticleActive ? "active" : ""}
        >
          Add New Article
        </li>
      )}

      <li
        onClick={() => {
          navigate("/profile");
          setMobileOpen(false);
        }}
        className={isProfileActive ? "active" : ""}
      >
        My Profile
      </li>

      {currentUser && currentUser.role === "admin" && (
        <li
          onClick={() => {
            navigate("/enroll");
            setMobileOpen(false);
          }}
          className={isEnrollActive ? "active" : ""}
        >
          Enroll Users
        </li>
      )}
    </>
  );

  const renderCategories = () => (
    <div className="categories-section">
      <div className="categories-header">
        <span>Categories</span>
      </div>

      <ul className="categories-with-articles">
        {categories.length > 0 ? (
          categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const isLoading = loadingCategories.includes(category.id);
            const articles = categoryArticles[category.id] || [];
            const hasMore = categoryHasMore[category.id] || false;
            const total = categoryTotals[category.id] || 0;

            return (
              <li key={category.id} className="category-item">
                <div
                  className="category-header"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <span className="category-name">
                    {category.name}
                    {total > 0 && (
                      <span className="article-count"> ({total})</span>
                    )}
                  </span>
                  <span className={`collapse-icon ${isExpanded ? "open" : ""}`}>
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>

                {isExpanded && (
                  <>
                    {articles.length > 0 ? (
                      <>
                        <ul className="articles-list">
                          {articles.map((article) => (
                            <li
                              key={article.id}
                              className="article-item"
                              onClick={() => handleArticleClick(article.id)}
                            >
                              {article.title || "Untitled"}
                            </li>
                          ))}
                        </ul>

                        {/* 🔥 Show More 按钮 */}
                        {hasMore && (
                          <div className="show-more-container">
                            <button
                              className="show-more-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadMore(category.id);
                              }}
                              disabled={isLoading}
                            >
                              {isLoading
                                ? "Loading..."
                                : `Show More (${articles.length}/${total})`}
                            </button>
                          </div>
                        )}
                      </>
                    ) : isLoading ? (
                      <div className="articles-loading">
                        Loading articles...
                      </div>
                    ) : (
                      <div className="articles-empty">
                        No articles in this category
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })
        ) : (
          <li className="no-categories">No categories available</li>
        )}
      </ul>
    </div>
  );

  return (
    <>
      <div className="mobile-navbar">
        <h2 onClick={() => navigate("/")}>Company Wiki</h2>
        <button
          className="hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          ☰
        </button>
      </div>

      <aside className="sidebar desktop-only">
        <h2 onClick={() => navigate("/")}>Company Wiki</h2>
        <ul className="main-menu">{renderMenuItems()}</ul>
        {renderCategories()}

        <div className="sidebar-user">
          {currentUser ? (
            <>
              <p>
                {currentUser.username} ({currentUser.role})
              </p>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <button onClick={() => navigate("/login")}>Login</button>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div className="mobile-menu">
          <ul className="main-menu">{renderMenuItems()}</ul>
          {renderCategories()}

          <div className="sidebar-user">
            {currentUser ? (
              <>
                <p>
                  {currentUser.username} ({currentUser.role})
                </p>
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigate("/login");
                  setMobileOpen(false);
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
