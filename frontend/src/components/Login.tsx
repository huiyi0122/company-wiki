import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="login-image">
          <div className="login-image-overlay">
            <h1 className="login-brand">Welcome Back</h1>
            <p className="login-brand-subtitle">
              Sign in to continue to your account
            </p>
          </div>
        </div>

        <div className="login-box">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h2>Sign In</h2>
              <p className="login-subtitle">
                Enter your credentials to access your account
              </p>
            </div>

            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className="login-button"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="login-footer">
              <p className="login-footer-text">
                Protected by enterprise-grade security
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
