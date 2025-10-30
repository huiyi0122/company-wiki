# ✨ Company Internal Wiki Backend

**Company Internal Wiki Backend** is a RESTful API for managing internal company documentation, including policies, SOPs, HR documents, project wikis, and onboarding guides.

---

## 1. 🌐 Project Overview

**Key Features:**

- CRUD operations for documents
- Full-text search across titles and content
- Categorization and tagging
- User authentication with JWT
- Role-based access (admin/editor/viewer)
- TypeScript for type safety

---

## 2. ⚒️ Tech Stack

- **Express.js (TypeScript)** – Backend framework
- **MySQL** – Relational database
- **Elasticsearch** – Full-text search engine
- **JWT Authentication** – Secure login and role-based access
- **Node.js (v18+)**
- **npm (v8+)**

---

## 3. 📁 Project Structure

```
├── src/
│   ├── controllers/      # CRUD and business logic
│   ├── middleware/       # Authentication, authorization, error handling
│   ├── models/           # Database models
│   ├── routes/           # API endpoints
│   ├── services/         # Database and service logic
│   ├── utils/            # Helper functions
│   ├── seeder.ts         # Auto database seeding
│   └── app.ts            # Express app entry point
├── .env                  # Environment variables
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## 4. ⚡ Getting Started

### Prerequisites

- Node.js v18+
- npm v8+
- MySQL
- Elasticsearch

### Environment Setup

1. Clone the repo:

```bash
git clone https://github.com/huiyi0122/company-wiki-backend.git
cd company-wiki-backend
```

2. Copy `.env.example` to `.env` and configure:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=company_wiki
JWT_SECRET=supersecretkey123
REFRESH_SECRET=anotherSuperSecret456
ELASTICSEARCH_HOST=http://localhost:9200
```

3. Install dependencies:

```bash
npm install
```

---

## 5. ⛳ Development

Start the backend server:

```bash
npm run dev
```

Backend runs at [http://localhost:3000](http://localhost:3000)

---

## 6. 📣 API Reference

### Auth Endpoints

- `POST /user/enroll` — Register new user
- `POST /login` — Login user (returns JWT)
- `POST /refresh-token` — Refresh access token
- `GET /me` — Get current user info

### Article Endpoints

- `GET /articles` — Get list of articles
- `POST /articles` — Create new articles
- `PUT /articles/:id` — Update articles
- `DELETE /articles/:id` — Soft delete article
- `GET /articles/search?q=...` — Search articles

### Categories Endpoints

- `GET /categories` — Get list of categories
- `POST /categories` — Create new categories
- `PUT /categories/:id` — Update categories
- `DELETE /categories/:id` — Soft delete
- `PATCH /categories/:id` — Restore deleted category

### Tags Endpoints

- `GET /tags` — Get list of tags
- `POST /tags` — Create new tags
- `PUT /tags/:id` — Update tags
- `DELETE /tags/:id` — Soft delete
- `PATCH /tags/:id` — Restore deleted tag

**Headers:**

```
Authorization: Bearer <token>
```

---

## 7. 🌱 Database Seeder

The project includes a **database seeder** that runs automatically when the backend container is built or started.

### What It Does

- ✅ Creates an **admin account**
- ✅ Adds default **categories** (e.g. `Company Policy`)
- ✅ Adds default **tags** (e.g. `General`, `article`, `markdown`)

### Default Admin Account

| Field        | Value               |
| ------------ | ------------------- |
| **Username** | `admin`             |
| **Email**    | `admin@example.com` |
| **Password** | `admin123`          |

> ⚠️ Please change the default password after first login.

---

## 8. 🐳 Docker Setup

This project uses Docker to run the backend, MySQL database, and Elasticsearch.

### Prerequisites

- Docker
- Docker Compose

### Docker Compose Configuration

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: company-wiki-backend
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=company_wiki
      - ELASTICSEARCH_HOST=http://elasticsearch:9200
      - JWT_SECRET=supersecretkey123
      - REFRESH_SECRET=anotherSuperSecret456
    depends_on:
      - db
      - elasticsearch
    volumes:
      - .:/app
      - /app/node_modules
    command: sh -c "npx wait-port db:3306 && npx ts-node src/seeder.ts && npx ts-node-dev --respawn src/server.ts"

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: company-wiki-frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://backend:3000
    depends_on:
      - backend
    volumes:
      - ../frontend:/app
      - /app/node_modules
    command: npm run dev -- --host

  db:
    image: mysql:8
    container_name: company-wiki-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: company_wiki
    volumes:
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    container_name: company-wiki-es
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  db_data:
  es_data:
```

### Start the Containers

```bash
docker-compose up --build
```

This will:

1. Build the backend image
2. Start MySQL and Elasticsearch containers
3. Automatically run the seeder
4. Start the backend server on [http://localhost:3000](http://localhost:3000)
