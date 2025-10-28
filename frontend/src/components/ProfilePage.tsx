import { useState } from "react";
import Sidebar from "./Sidebar";
import { apiFetch } from "../utils/api";
import type { User } from "./CommonTypes";
import "../styles/ProfilePage.css";

export default function ProfilePage({
  currentUser,
  setCurrentUser,
}: {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}) {
  const [username, setUsername] = useState(currentUser?.username || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // ✅ 如果用户未登录
  if (!currentUser) {
    return <div className="not-allowed">Please login first.</div>;
  }

  const safeUser = currentUser;

  // ✅ 仅在资料不完整时自动获取详细资料（无 useEffect）
  if (!safeUser.username && !fetching) {
    setFetching(true);
    (async () => {
      try {
        const res = await apiFetch(`/users/${safeUser.id}`);
        const result = await res.json();
        if (result.success && result.data) {
          setCurrentUser(result.data);
          setUsername(result.data.username);
        }
      } catch (err) {
        console.error("Failed to fetch user details:", err);
      } finally {
        setFetching(false);
      }
    })();
  }

  

  // ✅ 更新资料逻辑
  const handleUpdateProfile = async () => {
    if (!username && !password) {
      setMessage("⚠️ Please enter at least one field to update.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const body = {
        id: safeUser.id,
        username: username || safeUser.username,
        email: safeUser.email,
        role: safeUser.role,
        password: password || "", // 空密码则后端忽略更新
      };

      const res = await apiFetch(`/users`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      const result = await res.json();
      console.log("Profile update result:", result);

      if (result.success) {
        setMessage("✅ Profile updated successfully. Please log in again.");

        // 清除登录状态
        localStorage.removeItem("token");
        setCurrentUser(null);

        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setMessage(`❌ ${result.data?.message || "Update failed."}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="profile-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>My Profile</h1>
            <p>Manage your account information and password</p>
          </div>

          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-form">
              {/* Current Info Display */}
              <div className="current-info">
                <div className="info-item">
                  <span className="info-label">User ID: </span>
                  <span className="info-value">{safeUser.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email: </span>
                  <span className="info-value">{safeUser.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role: </span>
                  <span className="info-value role-badge">
                    {safeUser.role}
                  </span>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
                <span className="input-hint">Minimum 6 characters</span>
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="update-btn"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span> Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>

              {message && (
                <div
                  className={`message ${
                    message.includes("✅") ? "success" : "error"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
