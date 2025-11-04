import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/App.css";
import type { User } from "./components/CommonTypes";
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";
import Dashboard from "./components/Dashboard";
import EnrollPage from "./components/EnrollPage";
import ProfilePage from "./components/ProfilePage";
import TagsManagement from "./components/TagsManagement";
import LogDetailPage from "./components/LogDetailPage";
import { apiFetch } from "./utils/api";

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-box">
      <div className="spinner"></div>
      <p className="loading-text">Loading...</p>
    </div>
  </div>
);

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
  if (
    requiredRole &&
    currentUser.role !== requiredRole &&
    currentUser.role !== "admin"
  ) {
    return (
      <div className="restricted-access">
        <p>
          Access is restricted. You need "{requiredRole}" permissions to access
          this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // 初始化时验证用户登录状态
  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setCurrentUser(null);
          setIsLoadingUser(false);
          return;
        }

        console.log("🔍 Checking user authentication...");
        const res = await apiFetch("/me");
        const data = await res.json();
        const user = data.data?.user || data.user;

        if (res.ok && data.success && user) {
          console.log("✅ User authenticated:", user);
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          console.log("❌ User authentication failed");
          setCurrentUser(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error("❌ Error checking user:", err);
        setCurrentUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      } finally {
        setIsLoadingUser(false);
      }
    };
    checkUser();
  }, []);

  // 可选：主动检查token过期时间并提前刷新
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        // 解析JWT payload
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiryTime = payload.exp * 1000; // 转换为毫秒
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        // 如果token在5分钟内过期，主动刷新
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log("⏰ Token expiring soon, triggering proactive refresh");
          // 调用一个轻量级API来触发token刷新
          apiFetch("/me").catch(() => {
            // 静默失败，让用户下次操作时自动刷新
          });
        }
      } catch (err) {
        // 解析失败，忽略
      }
    };

    // 每分钟检查一次
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const routeProps = { currentUser, setCurrentUser, isLoadingUser };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={<Login setCurrentUser={setCurrentUser} />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute {...routeProps}>
              <Dashboard
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={
            <ProtectedRoute {...routeProps}>
              <Docs currentUser={currentUser} setCurrentUser={setCurrentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs/:id"
          element={
            <ProtectedRoute {...routeProps}>
              <DocDetail
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute {...routeProps} requiredRole="editor">
              <EditorPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute {...routeProps} requiredRole="editor">
              <EditorPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll"
          element={
            <ProtectedRoute {...routeProps} requiredRole="admin">
              <EnrollPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute {...routeProps}>
              <ProfilePage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tags"
          element={
            <ProtectedRoute {...routeProps} requiredRole="admin">
              <TagsManagement
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs/:types/:id"
          element={
            <LogDetailPage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          }
        />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}