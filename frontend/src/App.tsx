import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import type{ User, JWTPayload } from "./components/CommonTypes";
import Login from "./components/Login";
import Docs from "./components/Docs";
import DocDetail from "./components/DocDetail";
import EditorPage from "./components/EditorPage";
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./styles/App.css"; 

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      if (decoded.exp * 1000 > Date.now())
        setCurrentUser({
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        });
      else localStorage.removeItem("token");
    } catch {
      localStorage.removeItem("token");
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        <Route path="/dashboard" element={<Dashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route path="/docs" element={<Docs currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route path="/docs/:id" element={<DocDetail currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route path="/editor" element={<EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route path="/editor/:id" element={<EditorPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
      </Routes>
    <ToastContainer position="top-right" autoClose={3000} />

    </Router>
  );
}