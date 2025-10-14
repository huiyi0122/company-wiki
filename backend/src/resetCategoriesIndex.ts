// resetCategoriesIndex.ts
import { esClient } from "./elasticSearch"; // 如果你的 client 不在这里，改成实际路径
import database from "./db";

async function resetCategoriesIndex() {
  const indexName = "categories";

  try {
    console.log(`🧹 Deleting old index: ${indexName}...`);
    await esClient.indices.delete({ index: indexName }, { ignore: [404] });

    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          name: { type: "text" },
          slug: { type: "keyword" },
          is_active: { type: "boolean" },
          created_by: { type: "keyword" },
          updated_by: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    console.log("🔄 Syncing categories from MySQL...");
    const [rows]: any = await database.query(
      "SELECT id, name, slug, is_active, created_by, updated_by, created_at, updated_at FROM categories"
    );

    for (const category of rows) {
      await esClient.index({
        index: indexName,
        id: category.id.toString(),
        document: category,
      });
    }

    console.log(`🎉 Done! Reindexed ${rows.length} categories.`);
  } catch (err) {
    console.error("❌ Error resetting categories index:", err);
  } finally {
    process.exit();
  }
}

resetCategoriesIndex();
