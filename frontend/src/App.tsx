// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import type { User, JWTPayload } from "./components/CommonTypes";
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";
import Dashboard from "./components/Dashboard";
import EnrollPage from "./components/EnrollPage";
import ProfilePage from "./components/ProfilePage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/App.css";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      if (decoded.exp * 1000 > Date.now()) {
        setCurrentUser({
          id: decoded.id,
          username: decoded.username,
            email: "",  // ✅ 新增默认值
          role: decoded.role,
        });
      } else {
        localStorage.removeItem("token");
      }
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* 默认跳转到登录 */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 登录页 */}
        <Route
          path="/login"
          element={<Login setCurrentUser={setCurrentUser} />}
        />

        {/* 仪表盘 */}
        <Route
          path="/dashboard"
          element={
            <Dashboard
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />

        {/* 文章系统 */}
        <Route
          path="/docs"
          element={
            <Docs
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />
        <Route
          path="/docs/:id"
          element={
            <DocDetail
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />

        {/* 编辑器 */}
        <Route
          path="/editor"
          element={
            <EditorPage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />
        <Route
          path="/editor/:id"
          element={
            <EditorPage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />

        {/* 用户注册（仅 admin 可见） */}
        <Route
          path="/enroll"
          element={
            <EnrollPage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />

        {/* ✅ 用户资料页 */}
        <Route
          path="/profile"
          element={
            <ProfilePage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />
      </Routes>

      {/* Toast 通知容器 */}
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}
