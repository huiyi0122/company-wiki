// ⚠️ 直接导入 ES 客户端，避免触发初始化
import { Client } from "@elastic/elasticsearch";
import database from "./db";
import dotenv from "dotenv";
dotenv.config();

// 创建独立的 ES 客户端（使用正确的环境变量）
const esClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://elasticsearch:9200",
});

async function resetTagsIndex() {
  const indexName = "tags";

  try {
    // ✅ 删除旧索引（如果存在）
    try {
      console.log(`🧹 Deleting old index: ${indexName}...`);
      await esClient.indices.delete({ index: indexName });
      console.log(`✅ Index deleted successfully`);
      // 等待 3 秒确保索引完全删除
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (deleteErr: any) {
      if (deleteErr.meta?.statusCode === 404) {
        console.log(
          `ℹ️ Index ${indexName} does not exist, will create new one`
        );
      } else {
        throw deleteErr;
      }
    }

    // ✅ 创建新索引（字段与 categories 保持一致）
    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: "integer" },
          name: { type: "text" },
          slug: { type: "keyword" },
          is_active: { type: "boolean" },
          created_by: { type: "integer" }, // ✅ 添加
          created_by_name: { type: "keyword" },
          updated_by: { type: "integer" }, // ✅ 添加
          updated_by_name: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    // 🔄 从 MySQL 同步数据到 ES
    console.log("🔄 Syncing tags from MySQL...");
    const [rows]: any = await database.query(`
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_by,
        u1.username AS created_by_name,
        t.updated_by,
        u2.username AS updated_by_name,
        t.created_at,
        t.updated_at
      FROM tags t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.updated_by = u2.id
    `);

    for (const tag of rows) {
      await esClient.index({
        index: indexName,
        id: tag.id.toString(),
        document: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          is_active: Boolean(tag.is_active), // ✅ 强制布尔
          created_by: tag.created_by, // ✅ 添加数字 ID
          created_by_name: tag.created_by_name || null,
          updated_by: tag.updated_by, // ✅ 添加数字 ID
          updated_by_name: tag.updated_by_name || null,
          created_at: tag.created_at,
          updated_at: tag.updated_at,
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
