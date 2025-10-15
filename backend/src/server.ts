import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import userRouters from "./routes/user";
import categoryRouters from "./routes/categories";
import tagRouters from "./routes/tags";
import logsRouter from "./routes/logs";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // ✅ 你的前端地址
    credentials: true, // ✅ 允许发送 cookie / token
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/", authRoutes);
app.use("/articles", articleRoutes);
app.use("/users", userRouters);
app.use("/categories", categoryRouters);
app.use("/tags", tagRouters);
app.use("/logs", logsRouter);

app.get("/", (req, res) => {
  res.send("✅ API is running");
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running at http://0.0.0.0:3000");
});
