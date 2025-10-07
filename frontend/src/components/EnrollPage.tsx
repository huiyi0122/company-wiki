import { useState, useEffect } from "react";
import { API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import Sidebar from "./Sidebar";
import "../styles/EnrollPage.css";

export default function EnrollPage({
  currentUser,
  setCurrentUser,
}: {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState(""); // ✅ 新增，用于显示生成的密码

  // ===== 权限保护 =====
  if (!currentUser || currentUser.role !== "admin") {
    return <div className="not-allowed">Access denied. Admin only.</div>;
  }

  // ===== 获取用户列表 =====
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      
      if (result.success) setUsers(result.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ===== Email 格式验证 =====
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ✅ 随机密码生成函数
  const generateRandomPassword = (length = 10) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // ===== Enroll 新用户 =====
  const handleEnroll = async () => {
    setMessage("");

    if (!username || !email) {
      setMessage("⚠️ Email and username are required.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("⚠️ Please enter a valid email address (e.g. user@example.com).");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const randomPassword = generateRandomPassword(); // ✅ 自动生成
      setGeneratedPassword(randomPassword); // ✅ 显示生成的密码（可复制）

      const res = await fetch(`${API_BASE_URL}/users/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email, password: randomPassword, role }),
      });

      const result = await res.json();
console.log("Enroll response:", result); 

      if (result.success) {
        setMessage(`✅ User created successfully! Temporary password: ${randomPassword}`);
        setUsername("");
        setEmail("");
        setRole("viewer");
        fetchUsers();
      } else {
        setMessage(`❌ ${result.data?.message || "Enrollment failed"}`);
      }
    } catch (err) {
      console.error("Enroll error:", err);
      setMessage("❌ Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ===== 编辑角色 =====
  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const result = await res.json();
      if (result.success) fetchUsers();
    } catch (err) {
      console.error("Edit role error:", err);
    }
  };

  // ===== 删除用户 =====
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
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
        <div className="Enroll">
          <h2>Enroll New User</h2>

          <div className="enroll-form">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user email"
            />

            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />

            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>

            <button onClick={handleEnroll} disabled={loading}>
              {loading ? "Enrolling..." : "Enroll User"}
            </button>

            {generatedPassword && (
              <p className="generated-password">
                🔐 Temporary password: <b>{generatedPassword}</b>
              </p>
            )}

            {message && <p className="enroll-message">{message}</p>}
          </div>

          <h3 style={{ marginTop: "40px" }}>All Users</h3>
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.username}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
