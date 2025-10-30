import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import "../styles/Login.css";
import { apiFetch } from "../utils/api";
import { toast } from "react-toastify";

interface LoginProps {
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Login({ setCurrentUser }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    
    if (!username || !password) {
      toast.warn("Please fill all fields!");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok || !data.success) {
        toast.warn(data.message || "Invalid username or password!");
        return;
      }

      const { accessToken, refreshToken, user } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      console.log("✅ Login successful, user:", user);
      toast.success("Login successfully!");

      setCurrentUser(user);
      setTimeout(() => {
        navigate("/docs", { replace: true });
      }, 100);
    } catch (err) {
      console.error("Login failed:", err);
      toast.error(
        "Login request failed. Please check your connection or server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
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
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
