import React from "react";

interface StatsSectionProps {
  totalArticles: number;
  deletedArticlesCount: number;
  totalUsers: number;
}

export default function StatsSection({
  totalArticles,
  deletedArticlesCount,
  totalUsers,
}: StatsSectionProps) {
  return (
    <section className="stats-section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Total Articles</h3>
            <p className="stat-value">{totalArticles}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🗑️</div>
          <div className="stat-content">
            <h3>Deleted Articles</h3>
            <p className="stat-value">{deletedArticlesCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{totalUsers}</p>
          </div>
        </div>
      </div>
    </section>
  );
}