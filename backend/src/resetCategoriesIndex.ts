// ⚠️ 直接导入 ES 客户端，避免触发初始化
import { Client } from "@elastic/elasticsearch";
import database from "./db";
import dotenv from "dotenv";
dotenv.config();

// 创建独立的 ES 客户端（使用正确的环境变量）
const esClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://elasticsearch:9200",
});

async function resetCategoriesIndex() {
  const indexName = "categories";

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

    // ✅ 创建新索引
    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: "integer" },
          name: { type: "text" },
          slug: { type: "keyword" },
          is_active: { type: "boolean" },
          created_by: { type: "integer" }, // ✅ 改为 integer
          created_by_name: { type: "keyword" },
          updated_by: { type: "integer" }, // ✅ 改为 integer
          updated_by_name: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

    // 🔄 从 MySQL 同步数据到 ES
    console.log("🔄 Syncing categories from MySQL...");
    const [rows]: any = await database.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.is_active,
        c.created_by,
        u1.username AS created_by_name,
        c.updated_by,
        u2.username AS updated_by_name,
        c.created_at,
        c.updated_at
      FROM categories c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
    `);

    for (const category of rows) {
      await esClient.index({
        index: indexName,
        id: category.id.toString(),
        document: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          is_active: Boolean(category.is_active),
          created_by: category.created_by, // ✅ 数字 ID
          created_by_name: category.created_by_name || null,
          updated_by: category.updated_by, // ✅ 数字 ID
          updated_by_name: category.updated_by_name || null,
          created_at: category.created_at,
          updated_at: category.updated_at,
        },
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
