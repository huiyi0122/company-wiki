import React from "react";

interface Activity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="activity-card">
      <h2>Recent Activity</h2>
      <div className="activity-list">
        {activities.length > 0 ? (
          activities.map((act) => (
            <div key={act.id} className="activity-item">
              <div className="activity-icon">
                {act.type === "article" ? "📄" :
                  act.type === "category" ? "📂" :
                    act.type === "tag" ? "🏷️" : "✅"}
              </div>
              <div className="activity-content">
                <p>{act.description}</p>
                <span className="activity-time">
                  {new Date(act.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p>No recent activity found.</p>
        )}
      </div>
    </div>
  );
}