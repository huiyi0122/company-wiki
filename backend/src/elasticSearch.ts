import { Client } from "@elastic/elasticsearch";
import database from "./db";

export const esClient = new Client({ node: "http://localhost:9200" });

// -------------------- Articles --------------------
export async function createArticlesIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "articles" });
    if (!exists) {
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
    console.error("❌ Failed to create articles index:", err);
  }
}

export async function syncArticlesToES() {
  const [rows]: any = await database.query(`
    SELECT 
      a.id, a.title, a.content, a.category_id, a.author_id, a.is_active, a.created_at, a.updated_at,
      GROUP_CONCAT(t.name) AS tags
    FROM articles a
    LEFT JOIN article_tags at ON a.id = at.article_id
    LEFT JOIN tags t ON at.tag_id = t.id
    GROUP BY a.id
  `);

  for (const article of rows) {
    await esClient.index({
      index: "articles",
      id: article.id.toString(),
      document: {
        id: article.id,
        title: article.title,
        content: article.content,
        category_id: article.category_id,
        author_id: article.author_id,
        tags: article.tags ? article.tags.split(",") : [],
        is_active: !!article.is_active,
        created_at: article.created_at,
        updated_at: article.updated_at,
      },
    });
  }

  console.log(`✅ Synchronized ${rows.length} articles to Elasticsearch`);
}

// -------------------- Categories --------------------
export async function createCategoriesIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "categories" });
    if (!exists) {
      await esClient.indices.create({
        index: "categories",
        mappings: {
          properties: {
            id: { type: "integer" },
            name: { type: "text" },
            slug: { type: "text" },
            is_active: { type: "boolean" },
            created_by_name: { type: "keyword" },
            updated_by_name: { type: "keyword" },
          },
        },
      });
      console.log('✅ Elasticsearch index "categories" created');
    } else {
      console.log('ℹ️ Index "categories" already exists');
    }
  } catch (err) {
    console.error("❌ Failed to create categories index:", err);
  }
}

export async function syncCategoriesToES() {
  const [rows]: any = await database.query(`
    SELECT 
      c.id, c.name, c.slug, c.is_active,
      u1.username AS created_by_name,
      u2.username AS updated_by_name
    FROM categories c
    LEFT JOIN users u1 ON c.created_by = u1.id
    LEFT JOIN users u2 ON c.updated_by = u2.id
  `);

  for (const category of rows) {
    await esClient.index({
      index: "categories",
      id: category.id.toString(),
      document: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        is_active: !!category.is_active,
        created_by_name: category.created_by_name,
        updated_by_name: category.updated_by_name,
      },
    });
  }

  console.log(`✅ Synchronized ${rows.length} categories to Elasticsearch`);
}

// -------------------- Tags --------------------
export async function createTagsIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "tags" });
    if (!exists) {
      await esClient.indices.create({
        index: "tags",
        mappings: {
          properties: {
            id: { type: "integer" },
            name: { type: "text" },
            slug: { type: "text" },
            is_active: { type: "boolean" },
          },
        },
      });
      console.log('✅ Elasticsearch index "tags" created');
    } else {
      console.log('ℹ️ Index "tags" already exists');
    }
  } catch (err) {
    console.error("❌ Failed to create tags index:", err);
  }
}

export async function syncTagsToES() {
  const [rows]: any = await database.query(`
    SELECT id, name, slug, is_active FROM tags
  `);

  for (const tag of rows) {
    await esClient.index({
      index: "tags",
      id: tag.id.toString(),
      document: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        is_active: !!tag.is_active,
      },
    });
  }

  console.log(`✅ Synchronized ${rows.length} tags to Elasticsearch`);
}

// -------------------- 初始化示例 --------------------
export async function initAllES() {
  await createArticlesIndex();
  await createCategoriesIndex();
  await createTagsIndex();

  await syncArticlesToES();
  await syncCategoriesToES();
  await syncTagsToES();
}

// 调用一次初始化
// initAllES().catch(console.error);
