import React, { useEffect, useState } from "react";
import type { User } from "./CommonTypes";
import { PERMISSIONS } from "./CommonTypes";
import "../styles/Dashboard.css"; // 假设你需要一个 Dashboard.css 文件
import Sidebar from "./Sidebar";

interface DashboardProps {
    currentUser: User | null;
    // 1. ✅ 新增：接收 setCurrentUser (Sidebar组件需要)
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}
const API_BASE_URL = "http://192.168.0.18:3000"; // 你的后端地址

const fetchStats = async () => {
  try {
    // 从后端拿文章列表
    const res = await fetch(`${API_BASE_URL}/articles`);
    if (!res.ok) throw new Error("Failed to fetch articles");

    const articles = await res.json();

    return {
      totalArticles: articles.length,   // ✅ 真实的文章数量
      draftsPendingReview: 0,           // 暂时先用 0
      newUsersLast7Days: 0,             // 暂时先用 0
    };
  } catch (err) {
    console.error("❌ Failed to fetch stats:", err);
    return {
      totalArticles: 0,
      draftsPendingReview: 0,
      newUsersLast7Days: 0,
    };
  }
};


export default function Dashboard({ currentUser, setCurrentUser }: DashboardProps) {
    const [stats, setStats] = useState({
        totalArticles: 0,
        draftsPendingReview: 0,
        newUsersLast7Days: 0,
    });
    const [loading, setLoading] = useState(true);

    const setCategory = () => { };

    // 检查当前用户是否有编辑/管理权限
    const canManage = currentUser && PERMISSIONS[currentUser.role].includes("edit");

    useEffect(() => {
        // 只有有权限的用户才加载数据
        if (canManage) {
            setLoading(true);
            fetchStats().then((data) => {
                setStats(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [canManage]);

    if (!currentUser) {
        return <div className="dashboard-container">Please login to view the dashboard.</div>;
    }

    // 渲染 Dashboard 内容，同时添加侧边栏
    const dashboardContent = (
        
        <div className="dashboard-content">
            <h1>👋 Welcome back, {currentUser.username}!</h1>
            <p className="dashboard-role">
                Role: <strong>{currentUser.role}</strong>
            </p>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Articles</h3>
                    <p className="stat-value">{stats.totalArticles}</p>
                </div>

                <div className="stat-card pending">
                    <h3>Drafts Pending Review</h3>
                    <p className="stat-value">{stats.draftsPendingReview}</p>
                </div>

                <div className="stat-card">
                    <h3>New Users (Last 7 Days)</h3>
                    <p className="stat-value">{stats.newUsersLast7Days}</p>
                </div>
            </div>

            {/* 只有管理员（Admin）才能看到的内容 */}
            {currentUser.role === "admin" && (
                <div className="admin-actions">
                    <h2>Admin Actions</h2>
                    <button className="btn-primary">Manage Users</button>
                    <button className="btn-secondary">View System Logs</button>
                </div>
            )}

            <section className="recent-activity">
                <h2>Recent Activity</h2>
                <ul>
                    <li>User **ABC** submitted a new draft: *Q3 Marketing Strategy*.</li>
                    <li>User **DEF** approved article *Onboarding Flow Update*.</li>
                    <li>Category **HR** created by **system**.</li>
                </ul>
            </section>
        </div>
    );

    if (!canManage) {
        return (
            <div className="layout">
                <Sidebar
                    setCategory={setCategory}
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                />
                <div className="main-content-with-sidebar dashboard-container error">
                    <h2>Access Denied</h2>
                    <p>You do not have the required permissions to view the Dashboard.</p>
                    <p>Your role: {currentUser.role}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="layout">
                <Sidebar
                    setCategory={setCategory}
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                />
                <div className="main-content-with-sidebar dashboard-container">
                    Loading statistics...
                </div>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar
                setCategory={setCategory}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
            />
            <div className="main-content-with-sidebar dashboard-container">
                {dashboardContent}
            </div>
        </div>
    );
}
