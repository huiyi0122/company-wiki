import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import "../styles/Login.css";

interface LoginProps {
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Login({ setCurrentUser }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please fill all fields!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok || !data.success) {
        alert(data.message || "Invalid username or password!");
        return;
      }

      // 后端返回的结构是直接包含 accessToken / refreshToken / user
      const { accessToken, refreshToken, user } = data;

      // 存储 token
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // 更新当前用户状态
      setCurrentUser(user);

      // 跳转
      navigate("/docs");
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login request failed. Please check your connection or server.");
    }
  }; 

  return (
    <div className="login-container">
      <div className="login-split">
        <div className="login-image" />
        <div className="login-box text-center">
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
    </div>
  );
}
