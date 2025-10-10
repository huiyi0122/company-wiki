// src/components/Sidebar.tsx
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

export default function Sidebar({
  setCategory,
  currentUser,
  setCurrentUser,
}: SidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

// ✅ 获取分类数据（兼容分页结构）
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
      } else {
        console.error("Failed to load categories:", result.message);
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

  const handleCategoryClick = (catId: string) => {
    navigate(catId ? `/docs?category_id=${catId}` : "/docs");
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

  // ✅ 公共菜单列表（桌面端 & 移动端共用）
  const renderMenuItems = () => (
    <>
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

  return (
    <>
      {/* ✅ 顶部移动端导航 */}
      <div className="mobile-navbar">
        <h2 onClick={() => navigate("/")}>Company Wiki</h2>
        <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
          ☰
        </button>
      </div>

      {/* 🖥️ 桌面端 Sidebar */}
      <aside className="sidebar desktop-only">
        <h2>Company Wiki</h2>
        <ul className="main-menu">{renderMenuItems()}</ul>

        {/* Categories 部分 - 可折叠 */}
        <div className="categories-section">
          <div 
            className="categories-header"
            onClick={() => setCategoriesOpen(!categoriesOpen)}
          >
            <span>Categories</span>
            <span className={`collapse-icon ${categoriesOpen ? 'open' : ''}`}>
              {categoriesOpen ? '▼' : '►'}
            </span>
          </div>
          
          {categoriesOpen && (
            <ul className="categories-list">
              <li onClick={() => handleCategoryClick("")}>All</li>
              {categories.map((cat) => (
                <li key={cat.id} onClick={() => handleCategoryClick(cat.id.toString())}>
                  {cat.name}
                </li>
              ))}
            </ul>
          )}
        </div>

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

      {/* 📱 移动端 Sidebar */}
      {mobileOpen && (
        <div className="mobile-menu">
          <ul className="main-menu">{renderMenuItems()}</ul>

          {/* 移动端的 Categories 部分 */}
          <div className="categories-section">
            <div 
              className="categories-header"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
            >
              <span>Categories</span>
              <span className={`collapse-icon ${categoriesOpen ? 'open' : ''}`}>
                {categoriesOpen ? '▼' : '►'}
              </span>
            </div>
            
            {categoriesOpen && (
              <ul className="categories-list">
                <li onClick={() => handleCategoryClick("")}>All</li>
                {categories.map((cat) => (
                  <li
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id.toString())}
                  >
                    {cat.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

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