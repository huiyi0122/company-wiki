import { useState } from "react";
import Sidebar from "./Sidebar";
import { API_BASE_URL } from "./CommonTypes";
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

  if (!currentUser) {
    return <div className="not-allowed">Please login first.</div>;
  }

  const handleUpdateProfile = async () => {
    if (!username && !password) {
      setMessage("⚠️ Please enter at least one field to update.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      const body = {
        id: currentUser.id,
        username: username || currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        password: password || "", // 留空后端会忽略
      };

      const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      console.log("Profile update result:", result);

      if (result.success) {
        setMessage("✅ Profile updated successfully.");

        // 同步前端用户资料
        setCurrentUser({
          ...currentUser,
          username,
        });

        setPassword("");
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
            <div className="card-header">
              <h2>Account Information</h2>
            </div>
            
            <div className="profile-form">
              {/* Current Info Display */}
              <div className="current-info">
                <div className="info-item">
                  <span className="info-label">User ID:</span>
                  <span className="info-value">{currentUser.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{currentUser.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role:</span>
                  <span className="info-value role-badge">{currentUser.role}</span>
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

              <button onClick={handleUpdateProfile} disabled={loading} className="update-btn">
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </button>

              {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
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