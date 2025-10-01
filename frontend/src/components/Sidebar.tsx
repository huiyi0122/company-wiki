import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// ----------------------------------------------------------------------
import { getCategories, PERMISSIONS } from "./CommonTypes";
import type { User } from "./CommonTypes";
// ----------------------------------------------------------------------
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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setCategories(getCategories()), []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/login");
  };

  // 1. 判断 Dashboard 是否激活
  const isDashboardActive = location.pathname === "/dashboard";

  // 2. 判断 Editor-New 是否激活
  // 只有路径精确匹配 /editor/ 且没有 ID 时，才激活 "Add New Article"
  const isNewArticleActive = location.pathname === "/editor";

  // 3. 判断 Articles 是否激活
  // 在 /docs/*, 根目录 /，或在任何 /editor/:id 路由下（编辑模式）时都激活 Articles
  const isArticlesActive =
    location.pathname.startsWith("/docs") || 
    location.pathname === "/" ||
    (location.pathname.startsWith("/editor/") && !isNewArticleActive); 
    // ^ 使用 !isNewArticleActive 确保排除 /editor

  // 4. 辅助函数：点击分类时，如果不在 /docs 页面，则跳转到 /docs
  const handleCategoryClick = (cat: string) => {
    setCategory(cat);
    // 如果当前不在 /docs 路由下，跳转到 /docs 列表页
    if (!location.pathname.startsWith("/docs") && location.pathname !== "/") {
      navigate("/docs");
    }
  };

  return (
    <aside className="sidebar">
      <h2>Company Wiki</h2>
      <ul>
        {/* Dashboard 链接 */}
        {currentUser &&
          PERMISSIONS[currentUser.role].includes("edit") && (
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
        {currentUser &&
          PERMISSIONS[currentUser.role].includes("edit") && (
            <li
              onClick={() => navigate("/editor")}
              className={isNewArticleActive ? "active" : ""} // 使用新的激活状态
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
  );
}