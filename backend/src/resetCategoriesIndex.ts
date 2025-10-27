import { Client } from "@elastic/elasticsearch";
import database from "./db";
import dotenv from "dotenv";
dotenv.config();

const esClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://elasticsearch:9200",
});

async function resetCategoriesIndex() {
  const indexName = "categories";

  try {
    try {
      console.log(`🧹 Deleting old index: ${indexName}...`);
      await esClient.indices.delete({ index: indexName });
      console.log(`✅ Index deleted successfully`);
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

    console.log(`✅ Creating new index: ${indexName}...`);
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: "integer" },
          name: { type: "text" },
          slug: { type: "keyword" },
          is_active: { type: "boolean" },
          created_by: { type: "integer" },
          created_by_name: { type: "keyword" },
          updated_by: { type: "integer" },
          updated_by_name: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    });

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
          created_by: category.created_by,
          created_by_name: category.created_by_name || null,
          updated_by: category.updated_by,
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
