import { useState, useEffect} from "react";
// import { API_BASE_URL } from "./CommonTypes";
import type { User } from "./CommonTypes";
import Sidebar from "./Sidebar";
import "../styles/EnrollPage.css";
import { apiFetch } from "../utils/api";
import Modal from "./Modal";
import { toast } from "react-toastify";



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
  const [copied, setCopied] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;



const [modalState, setModalState] = useState<{
  isOpen: boolean;
  title: string;
  content: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
}>({
  isOpen: false,
  title: "",
  content: "",
  confirmText: "Confirm",
  onConfirm: () => {},
});

const closeModal = () => {
  setModalState({
    isOpen: false,
    title: "",
    content: "",
    confirmText: "Confirm",
    onConfirm: () => {},
  });
};

  if (!currentUser) {
    return <div className="not-allowed">User session not available.</div>;
  }

  // ✅ 获取用户列表 (改成 apiFetch)
  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/users");
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
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

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const generateRandomPassword = (length = 10) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // ✅ 注册新用户 (改成 apiFetch)
  const handleEnroll = async () => {
    setMessage("");

    if (!username || !email) {
      toast.warning("Email and username are required.");
      return;
    }

    if (!isValidEmail(email)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const randomPassword = generateRandomPassword();
      setGeneratedPassword(randomPassword);

      const res = await apiFetch("/users/enroll", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password: randomPassword,
          role,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`User "${username}" created successfully! Temporary password: ${randomPassword}`);
        setUsername("");
        setEmail("");
        setRole("viewer");
        fetchUsers();
      } else {
        toast.error(`❌ ${result.data?.message || "Enrollment failed"}`);
      }
    } catch (err) {
      console.error("Enroll error:", err);
      toast.error("❌ Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 删除用户 (改成 apiFetch)
  const handleDelete = (id: number) => {
  const targetUser = users.find((u) => u.id === id);
  const username = targetUser ? targetUser.username : "this user";

  setModalState({
    isOpen: true,
    title: "🗑️ Confirm Deletion",
    content: (
      <p>
        Are you sure you want to delete <strong>{username}</strong>?
        <br />
        This action cannot be undone.
      </p>
    ),
    confirmText: "Delete",
    onConfirm: async () => {
      closeModal();
      try {
        const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
          toast.success("User deleted successfully!");
          fetchUsers();
        } else {
          toast.error(`❌ ${result.data?.message || "Failed to delete user."}`);
        }
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("❌ Failed to delete user.");
      }
    },
  });
};


  // 分页计算
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = users.slice(startIndex, startIndex + usersPerPage);

  return (
    <div className="layout">
      <Sidebar setCategory={() => {}} currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <div className="main-content-with-sidebar">
        <div className="enroll-page">
          <div className="page-header">
            <h1>User Management</h1>
            <p>Enroll new users and manage existing ones</p>
          </div>

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
                  <code
                    className="password-value clickable"
                    onClick={() => {
                      if (!copied) {
                        navigator.clipboard.writeText(generatedPassword);
                        setMessage("📋 Temporary password copied!");
                        setCopied(true);
                        setTimeout(() => {
                          setMessage("");
                          setCopied(false);
                        }, 2000);
                      }
                    }}
                  >
                    {generatedPassword}
                  </code>
                </div>
              )}

              {message && (
                <div
                  className={`message ${
                    message.includes("✅") || message.includes("📋") ? "success" : "error"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>

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
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td className="actions">
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
      <Modal
  isOpen={modalState.isOpen}
  title={modalState.title}
  onClose={closeModal}
  onConfirm={modalState.onConfirm}
  confirmText={modalState.confirmText}
>
  <div className="modal-content-wrapper">
    {typeof modalState.content === "string" ? (
      <p>{modalState.content}</p>
    ) : (
      modalState.content
    )}
  </div>
</Modal>

    </div>
  );
}
