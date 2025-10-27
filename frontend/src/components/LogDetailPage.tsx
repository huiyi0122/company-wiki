import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "./Sidebar";
import type { User } from "./CommonTypes";
import { apiFetch } from "../utils/api";
import "../styles/LogDetailPage.css";

interface LogDetailPageProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface LogRecord {
  id: number;
  type: 'article' | 'tag' | 'category';
  target_id: number;
  action: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  old_data: string | null | any;
  new_data: string | null | any;
}

interface ParsedData {
  oldData: any;
  newData: any;
}

export default function LogDetailPage({
  currentUser,
  setCurrentUser,
}: LogDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogRecord | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 安全地解析 JSON 数据
  const safeParseJSON = (data: any): any => {
    if (!data) return null;
    
    // 如果已经是对象，直接返回
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    
    // 如果是字符串，尝试解析
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse JSON string:", e);
        console.error("Data:", data);
        return null;
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (!id) {
      setError("No log ID provided");
      setLoading(false);
      return;
    }

    const fetchLogDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 尝试使用单独的日志详情 API
        const detailResponse = await apiFetch(`/logs/${id}`);
        const detailResult = await detailResponse.json();
        
        if (detailResult.success && detailResult.data) {
          const foundLog = detailResult.data;
          setLog(foundLog);
          
          // 安全地解析数据
          const oldData = safeParseJSON(foundLog.old_data);
          const newData = safeParseJSON(foundLog.new_data);
          
          console.log("Parsed old_data:", oldData);
          console.log("Parsed new_data:", newData);
          
          setParsedData({ oldData, newData });
        } else {
          // 如果单独 API 失败，尝试从所有日志中查找
          const allLogsResponse = await apiFetch('/logs?limit=1000');
          const allLogsResult = await allLogsResponse.json();
          
          if (allLogsResult.success && Array.isArray(allLogsResult.data)) {
            const foundLog = allLogsResult.data.find((log: LogRecord) => log.id === parseInt(id!));
            if (foundLog) {
              setLog(foundLog);
              
              const oldData = safeParseJSON(foundLog.old_data);
              const newData = safeParseJSON(foundLog.new_data);
              
              setParsedData({ oldData, newData });
            } else {
              setError("Log not found");
            }
          } else {
            setError("Failed to load logs");
          }
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchLogDetail();
  }, [id]);

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': case 'SOFT_DELETE': return '🗑️';
      case 'RESTORE': return '♻️';
      default: return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': case 'SOFT_DELETE': return '#ef4444';
      case 'RESTORE': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getActionText = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'DELETE': case 'SOFT_DELETE': return 'Deleted';
      case 'RESTORE': return 'Restored';
      default: return action;
    }
  };

  // 将 JSON 对象转换为 Markdown 格式
  const jsonToMarkdown = (data: any, title: string): string => {
    if (!data) return '';

    let markdown = `# ${title}\n\n`;

    // 处理不同类型的数据
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        if (key === 'content' && typeof value === 'string') {
          // 如果是 content 字段，直接显示为 markdown
          markdown += `## ${formattedKey}\n\n${value}\n\n`;
        } else if (Array.isArray(value)) {
          // 数组类型
          markdown += `## ${formattedKey}\n\n`;
          if (value.length === 0) {
            markdown += `*No items*\n\n`;
          } else {
            value.forEach((item, index) => {
              if (typeof item === 'object') {
                markdown += `${index + 1}. ${JSON.stringify(item, null, 2)}\n`;
              } else {
                markdown += `- ${item}\n`;
              }
            });
            markdown += `\n`;
          }
        } else if (typeof value === 'object' && value !== null) {
          // 嵌套对象
          markdown += `## ${formattedKey}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
        } else if (typeof value === 'boolean') {
          markdown += `**${formattedKey}:** ${value ? '✅ Yes' : '❌ No'}\n\n`;
        } else if (value === null) {
          markdown += `**${formattedKey}:** *null*\n\n`;
        } else {
          markdown += `**${formattedKey}:** ${value}\n\n`;
        }
      }
    } else {
      markdown += `\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }

    return markdown;
  };

  if (loading) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="doc-loading">Loading change details...</div>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="layout">
        <Sidebar
          setCategory={() => {}}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
        <div className="main-content-with-sidebar">
          <div className="doc-not-found">
            <p>{error || "Change record not found ❌"}</p>
            <button 
              onClick={() => navigate("/dashboard")}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const oldMarkdown = parsedData?.oldData ? jsonToMarkdown(parsedData.oldData, 'Old Data') : '';
  const newMarkdown = parsedData?.newData ? jsonToMarkdown(parsedData.newData, 'New Data') : '';

  return (
    <div className="layout">
      <Sidebar
        setCategory={() => {}}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <div className="main-content-with-sidebar">
        <div className="log-detail-container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <button onClick={() => navigate("/dashboard")} className="breadcrumb-link">
              Dashboard
            </button>
            <span className="breadcrumb-separator">›</span>
            <button
              onClick={() => navigate("/dashboard")}
              className="breadcrumb-link"
            >
              Activity History
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Change Details</span>
          </nav>

          {/* Header */}
          <div className="log-header">
            <div className="log-header-content">
              <span className="log-action-icon" style={{ fontSize: '2.5em' }}>
                {getActionIcon(log.action)}
              </span>
              <div>
                <h1 style={{ color: getActionColor(log.action), marginBottom: '8px' }}>
                  {getActionText(log.action)} {log.type.charAt(0).toUpperCase() + log.type.slice(1)} #{log.target_id}
                </h1>
                <p style={{ color: '#6b7280', fontSize: '0.95em' }}>
                  Changed by <strong>{log.changed_by_name}</strong> • {new Date(log.changed_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Data Comparison - Two Columns with Markdown */}
          <div className="data-comparison-grid">
            {/* Old Data Column */}
            {parsedData?.oldData && (
              <div className="data-column old-data">
                <div className="data-column-header">
                  <span>📄</span>
                  <h2>Old Data</h2>
                </div>
                <div className="data-column-content markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {oldMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* New Data Column */}
            {parsedData?.newData && (
              <div className="data-column new-data">
                <div className="data-column-header">
                  <span>📝</span>
                  <h2>New Data</h2>
                </div>
                <div className="data-column-content markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {newMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Single Data Column (for CREATE or DELETE) */}
            {parsedData && (!parsedData.oldData || !parsedData.newData) && (parsedData.oldData || parsedData.newData) && (
              <div className="data-column single-data" style={{ gridColumn: '1 / -1' }}>
                <div className="data-column-header">
                  <span>📋</span>
                  <h2>
                    {!parsedData.oldData ? 'Created Data' : 'Deleted Data'}
                  </h2>
                </div>
                <div className="data-column-content markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {parsedData.oldData ? oldMarkdown : newMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* No Data Message */}
          {(!parsedData || (!parsedData.oldData && !parsedData.newData)) && (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              padding: '40px',
              background: '#f9fafb',
              borderRadius: '8px',
              fontStyle: 'italic'
            }}>
              No detailed data available for this action.
            </div>
          )}

          {/* Footer */}
          <div className="log-footer">
            <button 
              className="back-btn" 
              onClick={() => navigate("/dashboard")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}