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
