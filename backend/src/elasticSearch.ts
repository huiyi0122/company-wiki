import { Client } from "@elastic/elasticsearch";

export const esClient = new Client({ node: "http://localhost:9200" });

export async function createArticlesIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "articles" });

    if (!exists) {
      // ← just use exists directly
      await esClient.indices.create({
        index: "articles",
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
      console.log('✅ Elasticsearch index "articles" created');
    } else {
      console.log('ℹ️ Index "articles" already exists');
    }
  } catch (err) {
    console.error("❌ Failed to create index:", err);
  }
}

// 调用一次
createArticlesIndex().catch(console.error);
