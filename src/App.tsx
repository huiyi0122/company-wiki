import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {jwtDecode} from "jwt-decode"; // ✅ 默认导入
import './App.css'

// ===== 类型定义 =====
type Role = "admin" | "editor" | "viewer";

interface User {
  id: number;
  username: string;
  role: Role;
}

interface JWTPayload {
  id: number;
  username: string;
  role: Role;
  exp: number;
}

// ===== Login 页面 =====
function Login({ setCurrentUser }: { setCurrentUser: (u: User | null) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch("http://192.168.0.11:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        return alert("Invalid username or password!");
      }

      const data = await res.json();
      // 假设后端返回 { token: "..." }
      localStorage.setItem("token", data.token);

      const decoded = jwtDecode<JWTPayload>(data.token);
      setCurrentUser({
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      });

      navigate("/protected");
    } catch (err) {
      console.error(err);
      alert("Login failed!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}

// ===== Protected 页面 =====
function ProtectedPage() {
  const [data, setData] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://192.168.0.11:3000/protected", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => setData(JSON.stringify(json, null, 2)))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Protected Data</h2>
      <pre>{data}</pre>
      <Link to="/login">Back to Login</Link>
    </div>
  );
}

// ===== App 主入口 =====
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
        {/* ✅ 默认跳转，避免空白页 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        <Route path="/protected" element={<ProtectedPage />} />
      </Routes>
    </Router>
  );
}
