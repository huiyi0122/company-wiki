import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", authRoutes);
app.use("/articles", articleRoutes);
app.get("/", (req, res) => {
  res.send("✅ API is running");
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running at http://192.168.0.18:3000");
});
