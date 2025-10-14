// resetArticlesIndex.ts
import { esClient } from "./elasticSearch";
import database from "./db";

async function resetArticlesIndex() {
  const indexName = "articles";

  try {
    console.log(`🧹 Deleting old index: ${indexName}...`);
    await esClient.indices.delete({ index: indexName }, { ignore: [404] });

    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          title: { type: "text" },
          content: { type: "text" },
          category_id: { type: "integer" },
          author_id: { type: "integer" },
          tags: { type: "keyword" },
          is_active: { type: "boolean" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    console.log("🔄 Syncing articles from MySQL...");
    const [rows]: any = await database.query(
      "SELECT id, title, content, category_id, author_id, is_active, created_at, updated_at FROM articles"
    );

    for (const article of rows) {
      // 🧠 把数字 0/1 转成 true/false
      article.is_active = article.is_active === 1;

      await esClient.index({
        index: indexName,
        id: article.id.toString(),
        document: article,
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
