import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";

import articleRoutes from "./routes/articles";

import userRouters from "./routes/user";

import categoryRouters from "./routes/categories";

import tagRouters from "./routes/tags";
<<<<<<< HEAD
 
const app = express();
 
// ✅ 允许携带 cookie（非常关键）

app.use(

  cors({

    origin: "http://localhost:5173", // 你的前端地址

    credentials: true, // 允许跨域携带 cookie

  })

);
 
app.use(cookieParser());

app.use(express.json());
 
=======
import logsRouter from "./routes/logs";

const app = express();

// ✅ 中间件顺序很重要
app.use(express.json());

// CORS 配置 - localStorage 不需要 credentials
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 路由
>>>>>>> df6af74d5c5a51141167e7d58829beca9c5ae11a
app.use("/", authRoutes);

app.use("/articles", articleRoutes);

app.use("/users", userRouters);

app.use("/categories", categoryRouters);

app.use("/tags", tagRouters);
<<<<<<< HEAD
 
=======
app.use("/logs", logsRouter);

// 健康检查
>>>>>>> df6af74d5c5a51141167e7d58829beca9c5ae11a
app.get("/", (req, res) => {

  res.send("✅ API is running");

});
 
app.listen(3000, "0.0.0.0", () => {

  console.log("Server running at http://0.0.0.0:3000");

});

 