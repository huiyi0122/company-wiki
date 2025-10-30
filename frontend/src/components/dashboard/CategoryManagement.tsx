import React from "react";

interface Category {
  id: number;
  name: string;
  is_active?: number;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CategoryManagementProps {
  categories: Category[];
  catLoading: boolean;
  onEditCategory: (id: number, oldName: string, oldStatus: boolean, createdBy?: string) => void;
  onSoftDeleteCategory: (id: number, name: string) => void;
  onRestoreCategory: (id: number) => void;
  onRefresh: () => void;
}

export default function CategoryManagement({
  categories,
  catLoading,
  onEditCategory,
  onSoftDeleteCategory,
  onRestoreCategory,
  onRefresh,
}: CategoryManagementProps) {
  return (
    <div className="management-card">
      <div className="card-header">
        <h2>📂 Category Management</h2>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={catLoading}
        >
          {catLoading ? "Refreshing..." : "🔄 Refresh"}
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
            {categories.length > 0 ? (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td>#{cat.id}</td>
                  <td>{cat.name}</td>
                  <td>
                    <span
                      className={`status-badge ${cat.is_active ? "active" : "inactive"}`}
                    >
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{cat.created_by_name || cat.created_by || "-"}</td>
                  <td>{cat.updated_by_name || cat.updated_by || "-"}</td>
                  <td>
                    {cat.is_active ? (
                      <>
                        <button
                          className="btn-edit"
                          onClick={() => onEditCategory(cat.id, cat.name, !!cat.is_active, cat.created_by || undefined)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => onSoftDeleteCategory(cat.id, cat.name)}
                        >
                          🗑️
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-restore"
                        onClick={() => onRestoreCategory(cat.id)}
                      >
                        ♻️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-data">
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}