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
  const [generatedPassword, setGeneratedPassword] = useState("");

  // ✅ 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  // 权限控制
  if (!currentUser || currentUser.role !== "admin") {
    return <div className="not-allowed">Access denied. Admin only.</div>;
  }

  // 获取用户列表
const fetchUsers = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (result.success) {
      // ✅ 把对象转成数组
      const usersArray = Object.keys(result)
        .filter((key) => !isNaN(Number(key))) // 过滤掉 "success"
        .map((key) => result[key]);
      setUsers(usersArray);
    } else {
      console.error("Failed to fetch users:", result);
    }
  } catch (err) {
    console.error("Error fetching users:", err);
  }
};


  useEffect(() => {
    fetchUsers();
  }, []);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const generateRandomPassword = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleEnroll = async () => {
    setMessage("");

    if (!username || !email) {
      setMessage("⚠️ Email and username are required.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("⚠️ Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const randomPassword = generateRandomPassword();
      setGeneratedPassword(randomPassword);

      const res = await fetch(`${API_BASE_URL}/users/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email, password: randomPassword, role }),
      });

      const result = await res.json();
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
      if (result.success) {
        setMessage("✅ Role updated successfully!");
        fetchUsers();
      }
    } catch (err) {
      console.error("Edit role error:", err);
      setMessage("❌ Failed to update role.");
    }
  };

  const handleEditUser = async (id: number, newUsername: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername}),
      });
      const result = await res.json();
      if (result.success) {
        setMessage("✅ User updated successfully!");
        fetchUsers();
      } else {
        setMessage(`❌ ${result.data?.message || "Update failed."}`);
      }
    } catch (err) {
      console.error("Edit user error:", err);
      setMessage("❌ Server error.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setUsers(users.filter((u) => u.id !== id));
        setMessage("✅ User deleted successfully!");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setMessage("❌ Failed to delete user.");
    }
  };

  // ✅ 计算分页
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = users.slice(startIndex, startIndex + usersPerPage);

  return (
    <div className="layout">
      <Sidebar setCategory={() => {}} currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <div className="main-content-with-sidebar">
        <div className="enroll-page">
          {/* Header Section */}
          <div className="page-header">
            <h1>User Management</h1>
            <p>Enroll new users and manage existing ones</p>
          </div>

          {/* Enroll User Card */}
          <div className="enroll-card">
            <h2>Enroll New User</h2>
            <div className="enroll-form">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter user email" 
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Enter username" 
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={handleEnroll} disabled={loading} className="enroll-btn">
                {loading ? "Enrolling..." : "Enroll User"}
              </button>
              
              {generatedPassword && (
                <div className="password-display">
                  <span className="password-label">Temporary Password:</span>
                  <code className="password-value">{generatedPassword}</code>
                </div>
              )}
              
              {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Users Table Card */}
          <div className="users-card">
            <div className="card-header">
              <h2>All Users ({users.length})</h2>
            </div>
            
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="user-id">{user.id}</td>
                      <td>
                        <input
                          type="text"
                          value={user.username}
                          onChange={(e) => {
                            const newUsername = e.target.value;
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id ? { ...u, username: newUsername } : u
                              )
                            );
                          }}
                          className="editable-input"
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => {
                            const newEmail = e.target.value;
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id ? { ...u, email: newEmail } : u
                              )
                            );
                          }}
                          className="editable-input"
                        />
                      </td>
                      <td>
                        <select 
                          value={user.role} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="actions">
                        <button 
                          className="btn-save" 
                          onClick={() => handleEditUser(user.id, user.username)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {users.length === 0 && (
                <div className="empty-state">
                  <p>No users found. Enroll your first user above.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}