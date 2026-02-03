import express from "express";
import cors from "cors";
import morgan from "morgan";

import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

const app = express();
app.set("etag", false);

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = new Set([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://[::1]:5173",
      ]);
      // allow tools like curl/postman (no origin) and our frontend origins
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, name: "Marketplace API" }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
