import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import userRouters from "./routes/user";
import categoryRouters from "./routes/categories";
import tagRouters from "./routes/tags";
import logsRouter from "./routes/logs";

const app = express();

// ✅ 顺序很重要！
app.use(cookieParser());
app.use(express.json());

// ✅ 一定要指定具体 origin + credentials
app.use(
  cors({
    origin: "http://192.168.0.206:5173",
    credentials: true,
  })
);

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
