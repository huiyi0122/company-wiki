import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";

import articleRoutes from "./routes/articles";

import userRouters from "./routes/user";

import categoryRouters from "./routes/categories";

import tagRouters from "./routes/tags";
 
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
 
app.use("/", authRoutes);

app.use("/articles", articleRoutes);

app.use("/users", userRouters);

app.use("/categories", categoryRouters);

app.use("/tags", tagRouters);
 
app.get("/", (req, res) => {

  res.send("✅ API is running");

});
 
app.listen(3000, "0.0.0.0", () => {

  console.log("Server running at http://0.0.0.0:3000");

});

 