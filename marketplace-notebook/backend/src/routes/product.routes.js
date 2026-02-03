import express from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/product.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/* PUBLIC */
router.get("/", listProducts);
router.get("/:id", getProduct);

/* PRIVATE (seller/admin) */
router.post("/", protect, createProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

export default router;
