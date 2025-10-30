import React from "react";

interface Article {
  id: number;
  title: string;
  content: string;
  category_id?: number | null;
  author_id?: number;
  tags: string[];
  author: string;
  created_by?: string;
  updated_by?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface DeletedArticlesManagementProps {
  deletedArticles: Article[];
  articleLoading: boolean;
  articlePagination: Pagination;
  onEditArticle: (id: number) => void;
  onRestoreArticle: (id: number, title: string) => void;
  onRefresh: (page?: number) => void;
}

export default function DeletedArticlesManagement({
  deletedArticles,
  articleLoading,
  articlePagination,
  onEditArticle,
  onRestoreArticle,
  onRefresh,
}: DeletedArticlesManagementProps) {
  const totalArticlePages = Math.ceil(articlePagination.total / articlePagination.limit);

  return (
    <div className="management-card">
      <div className="card-header">
        <h2>🗑️ Deleted Articles</h2>
        <button
          className="refresh-btn"
          onClick={() => onRefresh(1)}
          disabled={articleLoading}
        >
          {articleLoading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>
      <div className="table-container">
        <table className="management-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Author</th>
              <th>Deleted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletedArticles.length > 0 ? (
              deletedArticles.map((article) => (
                <tr key={article.id}>
                  <td>#{article.id}</td>
                  <td>
                    <div style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {article.title}
                    </div>
                  </td>
                  <td>{article.author || "-"}</td>
                  <td>
                    {article.updated_at
                      ? new Date(article.updated_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => onEditArticle(article.id)}
                      title="Edit article"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-restore"
                      onClick={() => onRestoreArticle(article.id, article.title)}
                      title="Restore article"
                    >
                      ♻️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="no-data">
                  No deleted articles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalArticlePages > 1 && (
          <div className="pagination-container">
            <button
              className="btn-page"
              disabled={articlePagination.page === 1 || articleLoading}
              onClick={() => onRefresh(articlePagination.page - 1)}
            >
              ← Prev
            </button>
            <span className="page-info">
              Page {articlePagination.page} of {totalArticlePages}
            </span>
            <button
              className="btn-page"
              disabled={articlePagination.page >= totalArticlePages || articleLoading}
              onClick={() => onRefresh(articlePagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}