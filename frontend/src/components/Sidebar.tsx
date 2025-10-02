import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCategories, PERMISSIONS } from "./CommonTypes";
import type { User } from "./CommonTypes";
import "../styles/Sidebar.css";


interface SidebarProps {
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Sidebar({
  setCategory,
  currentUser,
  setCurrentUser,
}: SidebarProps) {
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setCategories(getCategories()), []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/login");
    setMobileOpen(false);
  };

  // 判断当前激活状态
  const isDashboardActive = location.pathname === "/dashboard";
  const isNewArticleActive = location.pathname === "/editor";
  const isArticlesActive =
    location.pathname.startsWith("/docs") ||
    location.pathname === "/" ||
    (location.pathname.startsWith("/editor/") && !isNewArticleActive);

  const handleCategoryClick = (cat: string) => {
    setCategory(cat);
    if (!location.pathname.startsWith("/docs") && location.pathname !== "/") {
      navigate("/docs");
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* 顶部导航栏 */}
      <div className="mobile-navbar">
        <h2 onClick={() => navigate("/")}>Company Wiki</h2>
        <button
          className="hamburger"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          ☰
        </button>
      </div>

      {/* 桌面 Sidebar */}
      <aside className="sidebar desktop-only">
        <h2>Company Wiki</h2>
        <ul>
          {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
            <li
              onClick={() => navigate("/dashboard")}
              className={isDashboardActive ? "active" : ""}
            >
              Dashboard
            </li>
          )}
          <li
            onClick={() => navigate("/docs")}
            className={isArticlesActive ? "active" : ""}
          >
            Articles
          </li>
          {currentUser && PERMISSIONS[currentUser.role].includes("edit") && (
            <li
              onClick={() => navigate("/editor")}
              className={isNewArticleActive ? "active" : ""}
            >
              Add New Article
            </li>
          )}
        </ul>

        <h3>Categories</h3>
        <ul>
          <li onClick={() => handleCategoryClick("")}>All</li>
          {categories.map((cat) => (
            <li key={cat} onClick={() => handleCategoryClick(cat)}>
              {cat}
            </li>
          ))}
        </ul>

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

      {/* 移动端下拉菜单 */}
      {mobileOpen && (
        <div className="mobile-menu">
          <ul>
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
          </ul>

          <h3>Categories</h3>
          <ul>
            <li onClick={() => handleCategoryClick("")}>All</li>
            {categories.map((cat) => (
              <li key={cat} onClick={() => handleCategoryClick(cat)}>
                {cat}
              </li>
            ))}
          </ul>

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
