import { esClient } from "./elasticSearch";
import database from "./db";

async function resetArticlesIndex() {
  const indexName = "articles";

  try {
    console.log(`🧹 Deleting old index: ${indexName}...`);
    await esClient.indices.delete({
      index: indexName,
      ignore_unavailable: true,
    });

    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          title: { type: "text", fields: { keyword: { type: "keyword" } } },
          content: { type: "text" },
          category_id: { type: "integer" },
          author_id: { type: "integer" },
          author_name: { type: "keyword" },
          tags: { type: "keyword" },
          is_active: { type: "boolean" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    console.log("🔄 Syncing articles from MySQL...");
    const [rows]: any = await database.query(`
      SELECT 
        a.id, a.title, a.content, a.category_id, a.author_id, u.username AS author_name,
        a.is_active, a.created_at, a.updated_at,
        GROUP_CONCAT(t.name) AS tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      GROUP BY a.id
    `);

    for (const article of rows) {
      article.is_active = article.is_active === 1;
      article.tags = article.tags ? article.tags.split(",") : [];

      await esClient.index({
        index: indexName,
        id: article.id.toString(),
        document: {
          id: article.id,
          title: article.title,
          content: article.content,
          category_id: article.category_id,
          author_id: article.author_id,
          author_name: article.author_name,
          tags: article.tags,
          is_active: article.is_active,
          created_at: article.created_at,
          updated_at: article.updated_at,
        },
      });
    }

    console.log(`🎉 Done! Reindexed ${rows.length} articles.`);
  } catch (err) {
    console.error("❌ Error resetting articles index:", err);
  } finally {
    process.exit();
  }
}

resetArticlesIndex();
