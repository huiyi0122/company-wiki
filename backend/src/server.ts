import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import userRouters from "./routes/user";
import categoryRouters from "./routes/categories";
import tagRouters from "./routes/tags";

const app = express();
app.use(cors());
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
  console.log("Server running at http://192.168.0.26:3000");
});
