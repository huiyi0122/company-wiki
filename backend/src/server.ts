import express from "express";
<<<<<<< Updated upstream
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import userRouters from "./routes/user";
import categoryRouters from "./routes/categories";
import tagRouters from "./routes/tags";
import logsRouter from "./routes/logs";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.0.10:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use("/", authRoutes);
app.use("/articles", articleRoutes);
app.use("/users", userRouters);
app.use("/categories", categoryRouters);
app.use("/tags", tagRouters);
app.use("/logs", logsRouter);

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

async function startServer() {
  try {
    app.listen(3000, "0.0.0.0", () => {
      console.log("Server running at http://0.0.0.0:3000");
      console.log("CORS enabled for:");
      console.log("- http://localhost:5173");
      console.log("- http://192.168.0.10:5173");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
startServer();

export default app;
=======
 
import cors from "cors";
 
import cookieParser from "cookie-parser";
 
import authRoutes from "./routes/auth";
 
import articleRoutes from "./routes/articles";
 
import userRouters from "./routes/user";
 
import categoryRouters from "./routes/categories";
 
import tagRouters from "./routes/tags";
 
import logsRouter from "./routes/logs"; // ✅ 添加缺失的 import
 
const app = express();
 
// ✅ 修复：添加 methods 和 allowedHeaders 支持 PATCH
 
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite 开发服务器
 
      "http://192.168.0.213:5173", // 局域网访问
    ],
 
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ 关键：添加 PATCH
 
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
 
    credentials: true, // 允许跨域携带 cookie
 
    preflightContinue: false,
 
    optionsSuccessStatus: 204,
  })
);
 
app.use(cookieParser());
 
app.use(express.json());
 
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
 
// ✅ 添加错误处理中间件
 
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("❌ Server Error:", err);
 
    res.status(500).json({
      success: false,
 
      message: "Internal server error",
 
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);
 
app.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running at http://0.0.0.0:3000");
 
  console.log("📡 CORS enabled for:");
 
  console.log("   - http://localhost:5173");
 
  console.log("   - http://192.168.0.213:5173");
});
 
export default app;
 
 
>>>>>>> Stashed changes
