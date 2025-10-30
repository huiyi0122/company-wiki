import React from "react";
import { useNavigate } from "react-router-dom";

interface LogRecord {
  id: number;
  type: 'article' | 'tag' | 'category';
  target_id: number;
  action: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  old_data: string | null;
  new_data: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface ActivityHistoryProps {
  logs: LogRecord[];
  logLoading: boolean;
  logTypeFilter: string;
  setLogTypeFilter: (value: string) => void;
  logDateFilter: string;
  setLogDateFilter: (value: string) => void;
  logStartDate: string;
  setLogStartDate: (value: string) => void;
  logEndDate: string;
  setLogEndDate: (value: string) => void;
  logPagination: Pagination;
  fetchLogs: (page?: number, type?: string, dateFilter?: string) => void;
}

export default function ActivityHistory({
  logs,
  logLoading,
  logTypeFilter,
  setLogTypeFilter,
  logDateFilter,
  setLogDateFilter,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  logPagination,
  fetchLogs,
}: ActivityHistoryProps) {
  const navigate = useNavigate();

  const getDisplayName = (log: LogRecord): string => {
    try {
      if (log.new_data) {
        const newData = typeof log.new_data === 'string'
          ? JSON.parse(log.new_data)
          : log.new_data;

        if (log.type === 'article' && newData.title) {
          return newData.title;
        }
        if ((log.type === 'tag' || log.type === 'category') && newData.name) {
          return newData.name;
        }
      }

      if (log.old_data) {
        const oldData = typeof log.old_data === 'string'
          ? JSON.parse(log.old_data)
          : log.old_data;

        if (log.type === 'article' && oldData.title) {
          return oldData.title;
        }
        if ((log.type === 'tag' || log.type === 'category') && oldData.name) {
          return oldData.name;
        }
      }

      return '-';
    } catch (e) {
      console.error('Error parsing log data:', e);
      return '-';
    }
  };

  const totalLogPages = Math.ceil(logPagination.total / logPagination.limit);

  return (
    <div className="management-card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <h2>📜 Activity History</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={logTypeFilter}
            onChange={(e) => setLogTypeFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option value="all">All Types</option>
            <option value="article">Articles</option>
            <option value="category">Categories</option>
            <option value="tag">Tags</option>
          </select>

          <select
            value={logDateFilter}
            onChange={(e) => setLogDateFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {logDateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={logStartDate}
                onChange={(e) => setLogStartDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#6b7280' }}>to</span>
              <input
                type="date"
                value={logEndDate}
                onChange={(e) => setLogEndDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
              <button
                className="refresh-btn"
                onClick={() => fetchLogs(1, logTypeFilter, "custom")}
                disabled={logLoading || !logStartDate || !logEndDate}
                style={{
                  opacity: (!logStartDate || !logEndDate) ? 0.5 : 1
                }}
              >
                Apply
              </button>
            </>
          )}

          <button
            className="refresh-btn"
            onClick={() => fetchLogs(1)}
            disabled={logLoading}
          >
            {logLoading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>
      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Name</th>
              <th>Action</th>
              <th>Changed By</th>
              <th>Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => {
                const displayName = getDisplayName(log);

                return (
                  <tr key={log.id}>
                    <td>#{log.target_id}</td>
                    <td>
                      <span className="status-badge active">
                        {log.type}
                      </span>
                    </td>
                    <td>
                      <div style={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: '500'
                      }} title={displayName}>
                        {displayName}
                      </div>
                    </td>
                    <td>
                      <strong>{log.action}</strong>
                    </td>
                    <td>{log.changed_by_name}</td>
                    <td>
                      {new Date(log.changed_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9em' }}>
                        <button
                          onClick={() => navigate(`/logs/${log.type}/${log.id}`)}
                          className="btn-view-details"
                          style={{
                            padding: '4px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.8em',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="View change details"
                        >
                          🔍 View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="no-data">
                  {logLoading ? "Loading logs..." : "No activity logs found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalLogPages > 1 && (
          <div className="pagination-container">
            <button
              className="btn-page"
              disabled={logPagination.page === 1 || logLoading}
              onClick={() => fetchLogs(logPagination.page - 1)}
            >
              ← Prev
            </button>
            <span className="page-info">
              Page {logPagination.page} of {totalLogPages}
            </span>
            <button
              className="btn-page"
              disabled={logPagination.page >= totalLogPages || logLoading}
              onClick={() => fetchLogs(logPagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}