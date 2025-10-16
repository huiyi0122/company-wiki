import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import type { User } from "./components/CommonTypes";
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";
import Dashboard from "./components/Dashboard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/App.css";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查是否已经登录（根据 cookie）
    const checkLogin = async () => {
      try {
        const res = await fetch("http://192.168.0.206:3000/me", {
          credentials: "include", // ⭐ 带上 cookie
        });

        const data = await res.json();

        if (res.ok && data.success && data.user) {
          setCurrentUser({
            id: data.user.id,
            username: data.user.username,
            role: data.user.role,
          });
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("❌ Failed to check login:", err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* 如果已登录，访问 /login 会跳去 /dashboard */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login setCurrentUser={setCurrentUser} />
            )
          }
        />

        {/* 登录后才能进 Dashboard */}
        <Route
          path="/dashboard"
          element={
            currentUser ? (
              <Dashboard
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 文档相关页面 */}
        <Route
          path="/docs"
          element={
            currentUser ? (
              <Docs currentUser={currentUser} setCurrentUser={setCurrentUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/docs/:id"
          element={
            currentUser ? (
              <DocDetail
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/editor"
          element={
            currentUser ? (
              <EditorPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/editor/:id"
          element={
            currentUser ? (
              <EditorPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}
