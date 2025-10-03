import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
// ----------------------------------------------------------------------
// ✅ FIX 1: Separating value imports (API_BASE_URL) from type imports (User, JWTPayload)
import { API_BASE_URL } from "./CommonTypes";
import type { User, JWTPayload } from "./CommonTypes";
// ----------------------------------------------------------------------
import "../styles/Login.css";

interface LoginProps {
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Login({ setCurrentUser }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) return console.error("Please fill all fields!");

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error(data.error || "Invalid username or password!");
        return;
      }

      localStorage.setItem("token", data.data.token);

      const decoded = jwtDecode<JWTPayload>(data.data.token);
      setCurrentUser({
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      });

      navigate("/docs");
    } catch (err) {
      console.error(err);
      console.error("Login failed!");
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
