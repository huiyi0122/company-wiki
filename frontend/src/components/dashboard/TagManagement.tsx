import React from "react";

interface Tag {
  id: number;
  name: string;
  is_active?: number | boolean;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface TagManagementProps {
  tags: Tag[];
  tagLoading: boolean;
  tagPagination: Pagination;
  onEditTag: (id: number, oldName: string, createdBy?: string) => void;
  onSoftDeleteTag: (id: number, name: string) => void;
  onRestoreTag: (id: number) => void;
  onRefresh: (page?: number) => void;
}

export default function TagManagement({
  tags,
  tagLoading,
  tagPagination,
  onEditTag,
  onSoftDeleteTag,
  onRestoreTag,
  onRefresh,
}: TagManagementProps) {
  const totalTagPages = Math.ceil(tagPagination.total / tagPagination.limit);

  return (
    <div className="management-card">
      <div className="card-header">
        <h2>🏷️ Tag Management</h2>
        <button
          className="refresh-btn"
          onClick={() => onRefresh(1)}
          disabled={tagLoading}
        >
          {tagLoading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>
      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Updated By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.length > 0 ? (
              tags.map((tag) => {
                const isActive = typeof tag.is_active === 'boolean'
                  ? tag.is_active
                  : !!tag.is_active;

                return (
                  <tr key={tag.id}>
                    <td>#{tag.id}</td>
                    <td>{tag.name}</td>
                    <td>
                      <span
                        className={`status-badge ${isActive ? "active" : "inactive"}`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{tag.created_by_name || tag.created_by || "-"}</td>
                    <td>{tag.updated_by_name || tag.updated_by || "-"}</td>
                    <td>
                      {isActive ? (
                        <>
                          <button
                            className="btn-edit"
                            onClick={() => onEditTag(tag.id, tag.name, tag.created_by || undefined)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => onSoftDeleteTag(tag.id, tag.name)}
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-restore"
                          onClick={() => onRestoreTag(tag.id)}
                        >
                          ♻️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="no-data">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalTagPages > 1 && (
          <div className="pagination-container">
            <button
              className="btn-page"
              disabled={tagPagination.page === 1 || tagLoading}
              onClick={() => onRefresh(tagPagination.page - 1)}
            >
              ← Prev
            </button>
            <span className="page-info">
              Page {tagPagination.page} of {totalTagPages}
            </span>
            <button
              className="btn-page"
              disabled={tagPagination.page >= totalTagPages || tagLoading}
              onClick={() => onRefresh(tagPagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}