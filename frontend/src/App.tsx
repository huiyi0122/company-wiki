import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import type { User } from "./components/CommonTypes";
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";
import Dashboard from "./components/Dashboard";
import EnrollPage from "./components/EnrollPage";
import ProfilePage from "./components/ProfilePage";
import TagsManagement from "./components/TagsManagement";

/* ===============================
   ⏳ 加载屏幕组件
================================ */
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans">
    <div className="text-center p-8 bg-white shadow-xl rounded-xl">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-lg text-gray-700">正在加载用户会话...</p>
    </div>
  </div>
);

/* ===============================
   🔒 路由保护组件
================================ */
const ProtectedRoute = ({
  children,
  currentUser,
  isLoadingUser,
  requiredRole,
}: {
  children: React.ReactNode;
  currentUser: User | null;
  isLoadingUser: boolean;
  requiredRole?: "admin" | "editor";
}) => {
  if (isLoadingUser) return <LoadingScreen />;

  if (!currentUser) return <Navigate to="/login" replace />;

  if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 font-sans">
        <p className="text-xl text-red-700 p-8 border border-red-300 rounded-lg shadow-md">
          访问受限。您需要 "{requiredRole}" 权限才能访问此页面。
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

/* ===============================
   🧠 主组件
================================ */
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // ✅ 恢复会话：从 localStorage 获取已登录用户
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setIsLoadingUser(false);
  }, []);

  const routeProps = { currentUser, setCurrentUser, isLoadingUser };

  return (
    <Router>
      <Routes>
        {/* 🏠 默认跳转登录 */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 🔑 登录页 */}
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />

        {/* 📊 仪表盘 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute {...routeProps}>
              <Dashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* 📚 文档列表 */}
        <Route
          path="/docs"
          element={
            <ProtectedRoute {...routeProps}>
              <Docs currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* 📄 文档详情 */}
        <Route
          path="/docs/:id"
          element={
            <ProtectedRoute {...routeProps}>
              <DocDetail currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* ✏️ 编辑器（仅 editor 或 admin） */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute {...routeProps} requiredRole="editor">
              <EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute {...routeProps} requiredRole="editor">
              <EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* 👥 用户注册（仅 admin） */}
        <Route
          path="/enroll"
          element={
            <ProtectedRoute {...routeProps} requiredRole="admin">
              <EnrollPage currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* 🧍 用户资料 */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute {...routeProps}>
              <ProfilePage currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />

        {/* 🏷️ 标签管理（仅 admin） */}
        <Route
          path="/tags-management"
          element={
            <ProtectedRoute {...routeProps} requiredRole="admin">
              <TagsManagement currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* ✅ Toast 全局提示容器 */}
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}
