import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// ----------------------------------------------------------------------
// ✅ FIX: Separating value imports (getCategories, PERMISSIONS) from type imports (User)
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

  // 1. 判断 Articles 是否激活
  const isArticlesActive =
    location.pathname.startsWith("/docs") || location.pathname === "/";

  // 2. 判断 Editor 是否激活
  const isEditorActive = location.pathname.startsWith("/editor");

  // 3. 辅助函数：点击分类时，如果不在 /docs 页面，则跳转到 /docs
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
              className={isEditorActive ? "active" : ""}
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
