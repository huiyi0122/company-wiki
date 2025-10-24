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

- **Express.js** (TypeScript) – Backend framework
- **MySQL** – Relational database
- **JWT Authentication** – Secure login and role-based access
- **Node.js** (v18+)
- **npm** (v8+)

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
│   └── app.ts            # Express app entry point
├── .env                  # Environment variables
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## 4. ⚡ Getting Started

### Prerequisites

- Node.js v18+
- npm v8+
- MySQL database

### Environment Setup

1. Clone the repo:

```bash
git clone https://github.com/huiyi0122/company-wiki-backend.git
cd company-wiki-backend
```

2. Copy `.env.example` to `.env` and configure:

```
DB_HOST – Database host (usually `localhost`)
DB_USER – Database username
DB_PASSWORD – Database password
DB_NAME – Database name
JWT_SECRET – Secret key used to sign access tokens
REFRESH_SECRET – Secret key used to sign refresh tokens
```

### Install Dependencies

```bash
npm install
```

---

## 5. ⛳ Development

Start the backend server:

```bash
npm run dev
```

- Runs Express backend at [http://localhost:3000](http://localhost:3000)

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
- `DELETE /articles/:id` — Delete articles
- `GET articles/search?q=...` — Search articles by title/content/category_id/tags

### Categories Endpoints

- `GET /categories` — Get list of categories
- `POST /categories` — Create new categories
- `PUT /categories/:id` — Update categories
- `DELETE /categories/:id` — SOFT_DELETE categories
- `PATCH /categories/:id` — Restore categories

### Tags Endpoint

- `GET /tags` — Get list of tags
- `POST /tags` — Create new tags
- `PUT /tags/:id` — Update tags
- `DELETE /tags/:id` — SOFT_DELETE tags
- `PATCH /tags/:id` — Restore tags

**Headers:**

```
Authorization: Bearer <token>
```

---

## 7. 🛠️ Troubleshooting

- **JWT errors**: Ensure `JWT_SECRET` matches your environment
- **Database connection issues**: Check `DB_URI` and ensure DB is running
- **Port conflicts**: Change `PORT` in `.env`

---

## 8. ✏️ Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add feature"`
4. Push branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 9. 🐳 Docker Setup

This project uses Docker to run the backend, MySQL database, and Elasticsearch. Follow the steps below to get started.

### Prerequisites

- Docker
- Docker Compose

### Services

- **backend**: Node.js API server
- **db**: MySQL 8 database
- **elasticsearch**: Elasticsearch 8.15

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
    command: npx ts-node-dev --respawn src/server.ts

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

1. Build the backend image.
2. Start MySQL and Elasticsearch containers.
3. Run the backend server on [http://localhost:3000](http://localhost:3000).

### Notes

- To reindex Elasticsearch after resetting or updating the schema, run your `resetArticlesIndex.ts` script inside the backend container.
- Database data and Elasticsearch data are persisted in Docker volum
