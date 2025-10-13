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

  // 🔥 追踪每个分类的状态
  const [categoryTotals, setCategoryTotals] = useState<Record<number, number>>(
    {}
  );
  const [categoryHasMore, setCategoryHasMore] = useState<
    Record<number, boolean>
  >({});
  const [categoryPages, setCategoryPages] = useState<Record<number, number>>(
    {}
  ); // 当前页码

  const navigate = useNavigate();
  const location = useLocation();

  const INITIAL_SIZE = 5; // 初始显示5篇
  const LOAD_MORE_SIZE = 20; // 点击 Show More 后每次加载20篇

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          const list = Array.isArray(result.data)
            ? result.data
            : Array.isArray(result.data?.data)
            ? result.data.data
            : [];
          setCategories(list.map((c: any) => ({ id: c.id, name: c.name })));
        }
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/login");
    setMobileOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/docs?q=${encodeURIComponent(searchTerm.trim())}`);
      setMobileOpen(false);
    }
  };

  // 🔥 使用 Elasticsearch 搜索接口加载文章（支持分页）
  const fetchCategoryArticles = async (
    categoryId: number,
    isLoadMore = false
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingCategories((prev) => [...prev, categoryId]);

    try {
      const currentPage = isLoadMore ? (categoryPages[categoryId] || 1) + 1 : 1;
      const limit = isLoadMore ? LOAD_MORE_SIZE : INITIAL_SIZE;

      // 🔥 使用 Elasticsearch 搜索接口，支持 page 参数
      const url = `${API_BASE_URL}/articles/search?category_id=${categoryId}&page=${currentPage}&limit=${limit}`;

      console.log(
        `🔍 Fetching articles for category ${categoryId}, page ${currentPage}, limit ${limit}`
      );

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();

      console.log(`🔍 API Response for category ${categoryId}:`, result);

      if (result.success && Array.isArray(result.data)) {
        const newArticles = result.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          category_id: a.category_id,
        }));

        // 🔥 修复：先声明 updatedArticles 变量
        let updatedArticles: Article[] = [];
        setCategoryArticles((prev) => {
          const existing = isLoadMore ? prev[categoryId] || [] : [];
          updatedArticles = [...existing, ...newArticles];
          return { ...prev, [categoryId]: updatedArticles };
        });

        const total = result.meta?.total || 0;
        const nextCursor = result.meta?.nextCursor;

        console.log(
          `📊 Meta info - total: ${total}, nextCursor: ${nextCursor}, currentPage: ${currentPage}, limit: ${limit}`
        );

        setCategoryTotals((prev) => ({ ...prev, [categoryId]: total }));
        setCategoryPages((prev) => ({ ...prev, [categoryId]: currentPage }));

        // 🔥 判断是否还有更多（根据 nextCursor）
        const hasMore = nextCursor !== null;
        setCategoryHasMore((prev) => ({ ...prev, [categoryId]: hasMore }));

        console.log(
          `📊 Category ${categoryId}: loaded ${updatedArticles.length}/${total}, hasMore: ${hasMore}, nextCursor: ${nextCursor}`
        );
      }
    } catch (err) {
      console.error(
        `❌ Error fetching articles for category ${categoryId}:`,
        err
      );
    } finally {
      setLoadingCategories((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  // 🔥 处理加载更多
  const handleLoadMore = (categoryId: number) => {
    fetchCategoryArticles(categoryId, true);
  };

  const handleCategoryClick = (categoryId: number) => {
    const isExpanded = expandedCategories.includes(categoryId);

    if (isExpanded) {
      setExpandedCategories((prev) => prev.filter((id) => id !== categoryId));
    } else {
      setExpandedCategories((prev) => [...prev, categoryId]);

      // 如果还没加载过，初始化加载
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
      <form onSubmit={handleSearch} className="sidebar-search-form">
        <div className="search-wrapper">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 14L11.1 11.1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="sidebar-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </form>

      {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
        <li
          onClick={() => {
            navigate("/dashboard");
            setMobileOpen(false);
          }}
          className={isDashboardActive ? "active" : ""}
        >
          <span className="menu-icon">📊</span>
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
        <span className="menu-icon">📚</span>
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
          <span className="menu-icon">✏️</span>
          New Article
        </li>
      )}

      <li
        onClick={() => {
          navigate("/profile");
          setMobileOpen(false);
        }}
        className={isProfileActive ? "active" : ""}
      >
        <span className="menu-icon">👤</span>
        Profile
      </li>

      {currentUser && currentUser.role === "admin" && (
        <li
          onClick={() => {
            navigate("/enroll");
            setMobileOpen(false);
          }}
          className={isEnrollActive ? "active" : ""}
        >
          <span className="menu-icon">➕</span>
          Enroll Users
        </li>
      )}
    </>
  );

  const renderCategories = () => (
    <div className="categories-section">
      <div className="categories-header">
        <span>CATEGORIES</span>
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
                  <div className="category-name">
                    <span
                      className={`collapse-icon ${isExpanded ? "open" : ""}`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M4.5 3L7.5 6L4.5 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="category-text">{category.name}</span>
                    {total > 0 && (
                      <span className="article-count">{total}</span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="articles-container">
                    {articles.length > 0 ? (
                      <>
                        <ul className="articles-list">
                          {articles.map((article) => (
                            <li
                              key={article.id}
                              className="article-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArticleClick(article.id);
                              }}
                            >
                              <span className="article-bullet">•</span>
                              {article.title || "Untitled"}
                            </li>
                          ))}
                        </ul>

                        {/* 🔥 Show More 按钮 - 显示已加载数量 / 总数 */}
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
                                : `Show more • ${articles.length} of ${total}`}
                            </button>
                          </div>
                        )}

                        {/* 🎉 已加载全部提示 */}
                        {!hasMore && articles.length > INITIAL_SIZE && (
                          <div className="all-loaded-hint">
                            All {total} articles loaded
                          </div>
                        )}
                      </>
                    ) : isLoading ? (
                      <div className="articles-loading">Loading...</div>
                    ) : (
                      <div className="articles-empty">No articles yet</div>
                    )}
                  </div>
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
      {/* 📱 移动端导航栏 */}
      <div className="mobile-navbar">
        <h2 onClick={() => navigate("/")}>Company Wiki</h2>
        <button
          className="hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12H21M3 6H21M3 18H21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 🖥️ 桌面端侧边栏 */}
      <aside className="sidebar desktop-only">
        <h2 onClick={() => navigate("/")}>
          <span className="logo-icon">📖</span>
          Company Wiki
        </h2>
        <ul className="main-menu">{renderMenuItems()}</ul>
        {renderCategories()}

        <div className="sidebar-user">
          {currentUser ? (
            <>
              <div className="user-info">
                <span className="user-avatar">
                  {currentUser.username.charAt(0).toUpperCase()}
                </span>
                <div className="user-details">
                  <p className="user-name">{currentUser.username}</p>
                  <p className="user-role">{currentUser.role}</p>
                </div>
              </div>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <button onClick={() => navigate("/login")}>Login</button>
          )}
        </div>
      </aside>

      {/* 📱 移动端菜单 */}
      {mobileOpen && (
        <div className="mobile-menu">
          <ul className="main-menu">{renderMenuItems()}</ul>
          {renderCategories()}

          <div className="sidebar-user">
            {currentUser ? (
              <>
                <div className="user-info">
                  <span className="user-avatar">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                  <div className="user-details">
                    <p className="user-name">{currentUser.username}</p>
                    <p className="user-role">{currentUser.role}</p>
                  </div>
                </div>
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
