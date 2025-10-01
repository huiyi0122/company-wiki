// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

// 导入类型
import type{ User, JWTPayload } from "./components/CommonTypes";

// 导入页面组件
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";

// 导入全局/布局样式
// src/App.tsx (Corrected)
import "./styles/App.css"; // Vite looks for src/styles/App.css
// 如果您没有创建单独的 DocDetail.css 和 EditorPage.css，则可以在 App.css 中包含它们的样式。
// 在这个示例中，我将使用您提供的 App.css。

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      if (decoded.exp * 1000 > Date.now())
        setCurrentUser({
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        });
      else localStorage.removeItem("token");
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/docs" replace />} />
        {/* 登录页面 */}
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        
        {/* 文档列表页 (含侧边栏) */}
        <Route path="/docs" element={<Docs currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        
        {/* 文档详情页 (含侧边栏) */}
        <Route path="/docs/:id" element={<DocDetail currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        
        {/* 编辑器 - 新增 (含侧边栏) */}
        <Route path="/editor" element={<EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        
        {/* 编辑器 - 编辑 (含侧边栏) */}
        <Route path="/editor/:id" element={<EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
      </Routes>
    </Router>
  );
}