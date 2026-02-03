import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    category: { type: String, required: true, index: true },

    // ✅ new fields
    imageUrl: { type: String, default: "" },
    processor: { type: String, default: "" },
    os: { type: String, default: "" },
    ram: { type: String, default: "" },
    storage: { type: String, default: "" },
    display: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },

    tags: [{ type: String }],
  },
  { timestamps: true }
);

productSchema.index({ category: 1, price: 1 });

// ✅ Auto-delete product when stock hits 0 (or ниже)
productSchema.post("save", async function (doc) {
  try {
    if (doc && typeof doc.stock === "number" && doc.stock <= 0) {
      await doc.deleteOne();
    }
  } catch (e) {
    console.error("Auto-delete (save) failed:", e.message);
  }
});

productSchema.post("findOneAndUpdate", async function (doc) {
  try {
    if (doc && typeof doc.stock === "number" && doc.stock <= 0) {
      await doc.deleteOne();
    }
  } catch (e) {
    console.error("Auto-delete (findOneAndUpdate) failed:", e.message);
  }
});

// ⚠️ оставляю как у тебя: коллекция "laptops"
export default mongoose.model("Product", productSchema, "laptops");
