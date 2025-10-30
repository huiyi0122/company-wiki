import { Client } from "@elastic/elasticsearch";
import database from "./db";

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
});

//  Articles
export async function createArticlesIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "articles" });
    if (!exists) {
      await esClient.indices.create({
        index: "articles",
        mappings: {
          properties: {
            title: { type: "text", fields: { keyword: { type: "keyword" } } },
            content: { type: "text" },
            category_id: { type: "integer" },
            author_id: { type: "integer" },
            tags: { type: "keyword" },
            is_active: { type: "boolean" },
            created_at: { type: "date" },
            updated_at: { type: "date" },
            created_by: { type: "keyword" },
            updated_by: { type: "keyword" },
          },
        },
      });
      console.log('Elasticsearch index "articles" created');
    } else {
      console.log('ℹIndex "articles" already exists');
    }
  } catch (err) {
    console.error(" Failed to create articles index:", err);
  }
}

export async function syncArticlesToES() {
  const [rows]: any = await database.query(`
      SELECT 
  a.id, a.title, a.content, a.category_id, a.author_id, u.username AS author_name,
  a.is_active, a.created_at, a.updated_at,
  GROUP_CONCAT(t.name) AS tags
FROM articles a
LEFT JOIN users u ON a.author_id = u.id
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
GROUP BY a.id;
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
        author_name: article.author_name,
        tags: article.tags ? article.tags.split(",") : [],
        is_active: !!article.is_active,
        created_at: article.created_at,
        updated_at: article.updated_at,
      },
    });
  }

  console.log(`Synchronized ${rows.length} articles to Elasticsearch`);
}

//  Categories
export async function createCategoriesIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "categories" });
    if (!exists) {
      await esClient.indices.create({
        index: "categories",
        mappings: {
          properties: {
            id: { type: "integer" },
            name: { type: "text", fields: { keyword: { type: "keyword" } } },
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
      console.log('Elasticsearch index "categories" created');
    } else {
      console.log('ℹIndex "categories" already exists');
    }
  } catch (err) {
    console.error("Failed to create categories index:", err);
  }
}

export async function syncCategoriesToES() {
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
      index: "categories",
      id: category.id.toString(),
      document: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        is_active: Boolean(category.is_active),
        created_by: category.created_by,
        created_by_name: category.created_by_name,
        updated_by: category.updated_by,
        updated_by_name: category.updated_by_name,
        created_at: category.created_at,
        updated_at: category.updated_at,
      },
    });
  }

  console.log(`Synchronized ${rows.length} categories to Elasticsearch`);
}

//  Tags
export async function createTagsIndex() {
  try {
    const exists = await esClient.indices.exists({ index: "tags" });
    if (!exists) {
      await esClient.indices.create({
        index: "tags",
        mappings: {
          properties: {
            id: { type: "integer" },
            name: { type: "text", fields: { keyword: { type: "keyword" } } },
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
      console.log('Elasticsearch index "tags" created');
    } else {
      console.log('ℹIndex "tags" already exists');
    }
  } catch (err) {
    console.error("Failed to create tags index:", err);
  }
}

export async function syncTagsToES() {
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
      index: "tags",
      id: tag.id.toString(),
      document: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        is_active: Boolean(tag.is_active),
        created_by: tag.created_by,
        created_by_name: tag.created_by_name,
        updated_by: tag.updated_by,
        updated_by_name: tag.updated_by_name,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      },
    });
  }

  console.log(`Synchronized ${rows.length} tags to Elasticsearch`);
}

export async function initAllES() {
  await createArticlesIndex();
  await createCategoriesIndex();
  await createTagsIndex();

  await syncArticlesToES();
  await syncCategoriesToES();
  await syncTagsToES();
}
