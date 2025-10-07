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
  const [email, setEmail] = useState(currentUser?.email || ""); 
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return <div className="not-allowed">Please login first.</div>;
  }

  // ✅ Email 格式验证函数
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleUpdateProfile = async () => {
    if (!username && !email && !password) {
      setMessage("⚠️ Please enter at least one field to update.");
      return;
    }

    // ✅ 检查 email 是否符合标准格式
    if (email && !validateEmail(email)) {
      setMessage("❌ Please enter a valid email address (e.g., name@example.com).");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      const body = {
        id: currentUser.id,
        username: username || currentUser.username,
        email: email || currentUser.email,
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
          email,
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
        <div className="profile">
          <h2>My Profile</h2>

          <div className="profile-form">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            {/* ✅ Email 输入框（带标准格式验证） */}
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />

            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank if unchanged"
            />

            <button onClick={handleUpdateProfile} disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </button>

            {message && <p className="profile-message">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
