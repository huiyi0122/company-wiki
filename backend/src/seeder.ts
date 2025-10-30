import database from "./db";
import bcrypt from "bcryptjs";
import { initAllES } from "./elasticSearch";

async function createTables() {
  console.log("Creating tables if not exist...");

  // Users
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','editor','viewer') DEFAULT 'viewer',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      email VARCHAR(255) UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `);

  // Categories
  await database.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(150),
      is_active TINYINT(1) DEFAULT 1,
      created_by INT,
      updated_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Tags
  await database.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(150),
      is_active TINYINT(1) DEFAULT 1,
      created_by INT,
      updated_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Articles
  await database.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      category_id INT,
      author_id INT NOT NULL,
      created_by INT NOT NULL,
      updated_by INT,
      is_active TINYINT(1) DEFAULT 1,
      last_activity VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users(id) ON UPDATE CASCADE,
      CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_articles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE,
      CONSTRAINT fk_articles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Article Tags
  await database.query(`
    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INT NOT NULL,
      tag_id INT NOT NULL,
      PRIMARY KEY(article_id, tag_id),
      CONSTRAINT article_tags_fk_article FOREIGN KEY (article_id) REFERENCES articles(id),
      CONSTRAINT article_tags_fk_tag FOREIGN KEY (tag_id) REFERENCES tags(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Logs
  await database.query(`
    CREATE TABLE IF NOT EXISTS article_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      article_id INT,
      action ENUM('CREATE','UPDATE','SOFT_DELETE','RESTORE') NOT NULL,
      changed_by INT NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      old_data JSON,
      new_data JSON,
      CONSTRAINT article_logs_fk_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS category_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      action ENUM('CREATE','UPDATE','SOFT_DELETE','RESTORE') NOT NULL,
      changed_by INT NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      old_data JSON,
      new_data JSON,
      CONSTRAINT category_logs_fk_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS tag_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tag_id INT,
      action ENUM('CREATE','UPDATE','SOFT_DELETE','RESTORE') NOT NULL,
      changed_by INT NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      old_data JSON,
      new_data JSON,
      CONSTRAINT tag_logs_fk_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("Tables created successfully!");
}

async function seedData() {
  console.log("Starting database seeding...");

  // --- Admin user ---
  const [adminRows] = await database.query(
    "SELECT * FROM users WHERE username = ?",
    ["admin"]
  );
  if ((adminRows as any[]).length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await database.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      ["admin", "admin@example.com", hashedPassword, "admin"]
    );
    console.log("Created admin user (username: admin / password: admin123)");
  }

  // --- Categories ---
  const categories = [{ name: "Company Policy", created_by: 1 }];
  for (const cat of categories) {
    const [rows] = await database.query(
      "SELECT * FROM categories WHERE name = ?",
      [cat.name]
    );
    if ((rows as any[]).length === 0) {
      await database.query(
        "INSERT INTO categories (name, created_by) VALUES (?, ?)",
        [cat.name, cat.created_by]
      );
      console.log(`Created category: ${cat.name}`);
    }
  }

  // --- Tags ---
  const tags = ["General", "article", "markdown"];
  for (const tagName of tags) {
    const [rows] = await database.query("SELECT * FROM tags WHERE name = ?", [
      tagName,
    ]);
    if ((rows as any[]).length === 0) {
      await database.query(
        "INSERT INTO tags (name, created_by) VALUES (?, ?)",
        [tagName, 1]
      );
      console.log(`Created tag: ${tagName}`);
    }
  }

  // --- Article ---
  const [articleRows] = await database.query(
    "SELECT * FROM articles WHERE title = ?",
    ["Welcome to Company Wiki!"]
  );
  if ((articleRows as any[]).length === 0) {
    await database.query(
      "INSERT INTO articles (title, content, author_id, category_id, created_by) VALUES (?, ?, ?, ?, ?)",
      [
        "Welcome to Company Wiki!",
        "## This is your first article. You can edit or delete it anytime.",
        1,
        1,
        1,
      ]
    );
    console.log("Created article: Welcome to Company Wiki!");
  }

  // --- Link Article with Tags ---
  const [article] = await database.query(
    "SELECT id FROM articles WHERE title = ?",
    ["Welcome to Company Wiki!"]
  );
  const articleId = (article as any[])[0]?.id;

  for (const tagName of tags) {
    const [tag] = await database.query("SELECT id FROM tags WHERE name = ?", [
      tagName,
    ]);
    const tagId = (tag as any[])[0]?.id;

    if (articleId && tagId) {
      const [linkRows] = await database.query(
        "SELECT * FROM article_tags WHERE article_id = ? AND tag_id = ?",
        [articleId, tagId]
      );
      if ((linkRows as any[]).length === 0) {
        await database.query(
          "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
          [articleId, tagId]
        );
        console.log(`Linked article "${articleId}" with tag "${tagId}"`);
      }
    }
  }

  console.log("Database seeding completed successfully!");
}

async function main() {
  try {
    await createTables();
    await seedData();
    console.log("Seeding Elasticsearch...");
    await initAllES();
    console.log("All seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

main();
