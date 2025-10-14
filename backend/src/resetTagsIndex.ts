// src/resetTagsIndex.ts
import { esClient } from "./elasticSearch";
import database from "./db";

async function resetTagsIndex() {
  const indexName = "tags";

  try {
    console.log(`🧹 Deleting old index: ${indexName}...`);
    await esClient.indices.delete({ index: indexName }, { ignore: [404] });

    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: "integer" },
          name: { type: "text" },
          slug: { type: "text" },
          is_active: { type: "boolean" },
          created_by: { type: "integer" },
          updated_by: { type: "integer" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    console.log("🔄 Syncing tags from MySQL...");
    const [rows]: any = await database.query(`
      SELECT id, name, slug, is_active, created_by, updated_by, created_at, updated_at
      FROM tags
    `);

    for (const tag of rows) {
      await esClient.index({
        index: indexName,
        id: tag.id.toString(),
        document: {
          ...tag,
          is_active: !!tag.is_active, // ✅ 确保是 true/false
        },
      });
    }

    console.log(`🎉 Done! Reindexed ${rows.length} tags.`);
  } catch (err) {
    console.error("❌ Error resetting tags index:", err);
  } finally {
    process.exit();
  }
}

resetTagsIndex();
