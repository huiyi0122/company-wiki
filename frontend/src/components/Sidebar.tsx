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

interface CategoryState {
  articles: Article[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  page: number;
}

export default function Sidebar({
  currentUser,
  setCurrentUser,
  setCategory,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // 🔥 使用单一状态对象管理所有分类数据
  const [categoryStates, setCategoryStates] = useState<Record<number, CategoryState>>({});

  const navigate = useNavigate();
  const location = useLocation();

  const PAGE_SIZE = 8; // 每次加载8篇文章

  // 📦 加载分类列表
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

  // 🔥 加载分类下的文章（支持追加加载）
  const fetchCategoryArticles = async (categoryId: number, isLoadMore = false) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // 设置加载状态
    setCategoryStates((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || { articles: [], total: 0, hasMore: false, page: 1 }),
        isLoading: true,
      },
    }));

    try {
      const currentState = categoryStates[categoryId];
      const page = isLoadMore && currentState ? currentState.page : 1;

      const url = `${API_BASE_URL}/articles?category_id=${categoryId}&page=${page}&limit=${PAGE_SIZE}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();

      if (result.success) {
        const newArticles = (result.data || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          category_id: a.category_id,
        }));

        const total = result.meta?.total || 0;
        const currentPage = result.meta?.page || page;
        const totalPages = result.meta?.totalPages || Math.ceil(total / PAGE_SIZE);

        setCategoryStates((prev) => {
          const existing = isLoadMore && prev[categoryId] ? prev[categoryId].articles : [];
          
          return {
            ...prev,
            [categoryId]: {
              articles: [...existing, ...newArticles],
              total,
              hasMore: currentPage < totalPages,
              isLoading: false,
              page: currentPage + 1, // 为下次加载准备
            },
          };
        });
      }
    } catch (err) {
      console.error(`Error fetching articles for category ${categoryId}:`, err);
      
      // 出错时重置加载状态
      setCategoryStates((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || { articles: [], total: 0, hasMore: false, page: 1 }),
          isLoading: false,
        },
      }));
    }
  };

  // 🔥 切换分类展开/收起
  const handleCategoryClick = (categoryId: number) => {
    const isExpanded = expandedCategories.has(categoryId);

    if (isExpanded) {
      // 收起
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    } else {
      // 展开
      setExpandedCategories((prev) => new Set(prev).add(categoryId));

      // 如果还没加载过，初始加载
      if (!categoryStates[categoryId]) {
        fetchCategoryArticles(categoryId, false);
      }
    }
  };

  // 🔥 加载更多文章
  const handleLoadMore = (categoryId: number) => {
    fetchCategoryArticles(categoryId, true);
  };

  const handleArticleClick = (articleId: number) => {
    navigate(`/docs/${articleId}`);
    setMobileOpen(false);
  };

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

  // 🎯 路由高亮判断
  const isProfileActive = location.pathname === "/profile";
  const isDashboardActive = location.pathname === "/dashboard";
  const isNewArticleActive = location.pathname === "/editor";
  const isArticlesActive =
    location.pathname.startsWith("/docs") ||
    location.pathname === "/" ||
    (location.pathname.startsWith("/editor/") && !isNewArticleActive);
  const isEnrollActive = location.pathname === "/enroll";

  // 🎨 渲染主菜单
  const renderMenuItems = () => (
    <>
      <form onSubmit={handleSearch} className="sidebar-search-form">
        <input
          type="text"
          placeholder="Search articles..."
          className="sidebar-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

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

  // 🎨 渲染分类和文章
  const renderCategories = () => (
    <div className="categories-section">
      <div className="categories-header">
        <span>Categories</span>
      </div>

      <ul className="categories-with-articles">
        {categories.length > 0 ? (
          categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const state = categoryStates[category.id];
            const articles = state?.articles || [];
            const total = state?.total || 0;
            const hasMore = state?.hasMore || false;
            const isLoading = state?.isLoading || false;

            return (
              <li key={category.id} className="category-item">
                <div
                  className="category-header"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <span className="category-name">
                    {category.name}
                    {total > 0 && <span className="article-count"> ({total})</span>}
                  </span>
                  <span className={`collapse-icon ${isExpanded ? "open" : ""}`}>
                    {isExpanded ? "▼" : "►"}
                  </span>
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
                      <div className="articles-loading">Loading articles...</div>
                    ) : (
                      <div className="articles-empty">No articles in this category</div>
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
        <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
          ☰
        </button>
      </div>

      {/* 🖥️ 桌面端侧边栏 */}
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

      {/* 📱 移动端菜单 */}
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