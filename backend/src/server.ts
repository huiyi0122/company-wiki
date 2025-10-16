import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import userRouters from "./routes/user";
import categoryRouters from "./routes/categories";
import tagRouters from "./routes/tags";
import logsRouter from "./routes/logs";

const app = express();

// ✅ 中间件顺序很重要
app.use(express.json());

// CORS 配置 - localStorage 不需要 credentials
app.use(
  cors({
    origin: "http://192.168.0.44:5173",
    credentials: false, // 改为 false，因为用 localStorage 而不是 cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // 添加 Authorization header
  })
);

// 路由
app.use("/", authRoutes);
app.use("/articles", articleRoutes);
app.use("/users", userRouters);
app.use("/categories", categoryRouters);
app.use("/tags", tagRouters);
app.use("/logs", logsRouter);

// 健康检查
app.get("/", (req, res) => {
  res.send("✅ API is running");
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running at http://0.0.0.0:3000");
});
