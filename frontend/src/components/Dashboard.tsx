import React from "react";
import type { User } from "./CommonTypes";
import Sidebar from "./Sidebar";

interface DashboardProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Dashboard({ currentUser, setCurrentUser }: DashboardProps) {
  // ⚠️ Sidebar 组件需要 setCategory prop，这里传一个空函数即可
  const setCategory = () => {};

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-700">Please login to view the dashboard.</p>
      </div>
    );
  }

  // ✅ 只渲染 Sidebar
  return (
    <div className="layout flex min-h-screen bg-gray-50">
      <Sidebar
        setCategory={setCategory}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
    </div>
  );
}
