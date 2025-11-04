import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/App.css"; // <-- 引入全局 CSS
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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setCurrentUser(null);
          setIsLoadingUser(false);
          return;
        }

        const res = await apiFetch("/me");
        const data = await res.json();
        const user = data.data?.user || data.user;

        if (res.ok && data.success && user) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        }
      } catch (err) {
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
