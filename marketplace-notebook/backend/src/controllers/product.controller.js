import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

/**
 * Read from "laptops" collection (Kaggle dataset).
 * Dynamic schema because laptops have "weird" keys.
 */
const Laptop =
  mongoose.models.Laptop ||
  mongoose.model(
    "Laptop",
    new mongoose.Schema({}, { strict: false, collection: "laptops" })
  );

// --- helpers ---
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toNumberMaybe(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function extractLaptopPrice(obj) {
  if (!obj) return 0;

  const direct = toNumberMaybe(obj.price);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const pDot = toNumberMaybe(obj?.["price(in Rs.)"]);
  if (Number.isFinite(pDot) && pDot > 0) return pDot;

  const pPar = toNumberMaybe(obj?.["price(in Rs)"]);
  if (Number.isFinite(pPar) && pPar > 0) return pPar;

  const nested1 = toNumberMaybe(obj?.["price(in Rs"]?.[")"]);
  if (Number.isFinite(nested1) && nested1 > 0) return nested1;

  const nested2 = toNumberMaybe(obj?.["price(in Rs)"]?.[")"]);
  if (Number.isFinite(nested2) && nested2 > 0) return nested2;

  const nested3 = toNumberMaybe(obj?.["price(in Rs.)"]?.[")"]);
  if (Number.isFinite(nested3) && nested3 > 0) return nested3;

  return 0;
}

function removeWeirdPriceKeys(obj) {
  const clean = { ...obj };
  delete clean["price(in Rs"];
  delete clean["price(in Rs)"];
  delete clean["price(in Rs.)"];
  return clean;
}

function normalizeProduct(doc) {
  const obj = doc?.toObject ? doc.toObject() : doc;
  const clean = removeWeirdPriceKeys(obj);

  const price = extractLaptopPrice(obj);

  // build title for Kaggle dataset too
  const fallbackTitle =
    clean.title ||
    clean.name ||
    (clean.Company && clean.Product ? `${clean.Company} ${clean.Product}` : "") ||
    clean.Product ||
    clean.Company ||
    "";

  // ✅ map dataset fields into our unified fields (best-effort)
  const processor =
    clean.processor ||
    clean.Cpu ||
    clean.CPU ||
    clean.CpuName ||
    "";

  const ram = clean.ram || clean.Ram || clean.Memory || "";
  const storage = clean.storage || clean.Storage || clean.Memory || "";
  const os = clean.os || clean.OpSys || clean.OS || "";
  const display =
    clean.display ||
    clean["display(in inch)"] ||
    clean.ScreenResolution ||
    "";

  return {
    ...clean,
    title: fallbackTitle,
    price,

    // ✅ unified image field
    imageUrl: clean.imageUrl || clean.img_link || clean.image || "",

    category: clean.category || "laptops",
    stock: Number.isFinite(Number(clean.stock)) ? Number(clean.stock) : 0,
    description: clean.description || "",
    tags: Array.isArray(clean.tags) ? clean.tags : [],
    brand: clean.brand || clean.Company || "",

    // ✅ new unified fields
    processor,
    os,
    ram,
    storage,
    display,
  };
}

// --- CRUD for your own Products collection ---
export const createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    price,
    stock,
    tags = [],

    // ✅ new
    imageUrl,
    processor,
    os,
    ram,
    storage,
    display,
  } = req.body;

  const p = Number(price);
  const s = Number(stock);

  if (!title || !category || !Number.isFinite(p) || !Number.isFinite(s)) {
    return res.status(400).json({ message: "Missing/invalid fields" });
  }

  const product = await Product.create({
    sellerId: req.user._id,

    title: String(title).trim(),
    description: description ? String(description) : "",
    category: String(category).trim(),

    price: p,
    stock: s,

    tags: Array.isArray(tags) ? tags : [],

    // ✅ new
    imageUrl: imageUrl ? String(imageUrl).trim() : "",
    processor: processor ? String(processor).trim() : "",
    os: os ? String(os).trim() : "",
    ram: ram ? String(ram).trim() : "",
    storage: storage ? String(storage).trim() : "",
    display: display ? String(display).trim() : "",
  });

  // ⚠️ если stock <= 0 — модель может авто-удалить после save hook.
  // возвращаем то что создали (для фронта), даже если потом удалится.
  res.status(201).json(product);
});

// --- LIST (supports laptops dataset when category is missing or = laptops) ---
export const listProducts = asyncHandler(async (req, res) => {
  // Prevent caching issues
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  const {
    q = "",
    category,
    minPrice,
    maxPrice,
    tag,
    sort = "new",
    page = 1,
    limit = 50,
  } = req.query;

  const useLaptops = !category || category === "laptops";

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 50));

  const minP = minPrice != null ? Number(minPrice) : null;
  const maxP = maxPrice != null ? Number(maxPrice) : null;

  const qq = String(q || "").trim();

  if (useLaptops) {
    // ----- LAPTOPS COLLECTION -----
    const mongoFilter = {};

    if (qq) {
      const re = new RegExp(escapeRegex(qq), "i");
      mongoFilter.$or = [
        // your custom fields
        { name: re },
        { title: re },
        { brand: re },
        { category: re },
        { processor: re },
        { ram: re },
        { storage: re },
        { os: re },
        { display: re },

        // Kaggle laptop fields
        { Company: re },
        { Product: re },
        { TypeName: re },
        { Cpu: re },
        { CPU: re },
        { Ram: re },
        { Memory: re },
        { OpSys: re },
        { ScreenResolution: re },
        { Gpu: re },
        { GPU: re },
      ];
    }

    const docs = await Laptop.find(mongoFilter).lean();
    let items = docs.map((d) => normalizeProduct(d));

    if (Number.isFinite(minP)) items = items.filter((it) => it.price >= minP);
    if (Number.isFinite(maxP)) items = items.filter((it) => it.price <= maxP);

    if (sort === "priceAsc") items.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") items.sort((a, b) => b.price - a.price);

    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / limitNum));

    const start = (pageNum - 1) * limitNum;
    const paged = items.slice(start, start + limitNum);

    return res.json({
      items: paged,
      page: pageNum,
      limit: limitNum,
      total,
      pages,
      q: qq,
    });
  }

  // ----- PRODUCTS COLLECTION (your CRUD model) -----
  const filter = {};
  if (category) filter.category = category;
  if (tag) filter.tags = { $in: [tag] };

  if (qq) {
    const re = new RegExp(escapeRegex(qq), "i");
    filter.$or = [
      { title: re },
      { category: re },
      { processor: re },
      { os: re },
      { ram: re },
      { storage: re },
      { display: re },
    ];
  }

  if (Number.isFinite(minP) || Number.isFinite(maxP)) {
    filter.price = {};
    if (Number.isFinite(minP)) filter.price.$gte = minP;
    if (Number.isFinite(maxP)) filter.price.$lte = maxP;
  }

  const sortMap = {
    new: { createdAt: -1, _id: -1 },
    priceAsc: { price: 1, _id: 1 },
    priceDesc: { price: -1, _id: -1 },
  };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sortMap[sort] || sortMap.new)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({ items, page: pageNum, limit: limitNum, total });
});

// --- GET ONE: supports both Products and Laptops ---
export const getProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const product = await Product.findById(id);
  if (product) return res.json(normalizeProduct(product));

  const laptop = await Laptop.findById(id).lean();
  if (!laptop) return res.status(404).json({ message: "Product not found" });

  res.json(normalizeProduct(laptop));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (req.user.role !== "admin" && String(product.sellerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const {
    title,
    description,
    category,
    price,
    stock,

    // ✅ new
    imageUrl,
    processor,
    os,
    ram,
    storage,
    display,

    addTag,
    removeTag,
  } = req.body;

  const setObj = {};
  if (title != null) setObj.title = String(title);
  if (description != null) setObj.description = String(description);
  if (category != null) setObj.category = String(category);

  if (imageUrl != null) setObj.imageUrl = String(imageUrl);
  if (processor != null) setObj.processor = String(processor);
  if (os != null) setObj.os = String(os);
  if (ram != null) setObj.ram = String(ram);
  if (storage != null) setObj.storage = String(storage);
  if (display != null) setObj.display = String(display);

  if (price != null) {
    const p = Number(price);
    if (!Number.isFinite(p)) return res.status(400).json({ message: "Invalid price" });
    setObj.price = p;
  }

  if (stock != null) {
    const s = Number(stock);
    if (!Number.isFinite(s)) return res.status(400).json({ message: "Invalid stock" });
    setObj.stock = s;
  }

  const update = {};
  if (Object.keys(setObj).length) update.$set = setObj;
  if (addTag) update.$push = { tags: addTag };
  if (removeTag) update.$pull = { tags: removeTag };

  const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(updated);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (req.user.role !== "admin" && String(product.sellerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await product.deleteOne();
  res.json({ message: "Deleted" });
});
