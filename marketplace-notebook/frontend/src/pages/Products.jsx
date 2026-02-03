import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { getUser } from "../auth";
import { addToCart } from "../cart";

export default function Products() {
  const nav = useNavigate();
  const user = getUser();

  // 🔥 СТАВЬ 20 или 50 (как хочешь)
  const LIMIT = 20;

  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // Pagination
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Create product form (seller/admin)
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [stock, setStock] = React.useState("");

  const canManage = user && (user.role === "seller" || user.role === "admin");

  // helpers (supports dataset + your created products)
  const getTitle = (p) => p.title || p.name || "Product";
  const getImage = (p) => p.imageUrl || p.img_link || "";

  const getPrice = (p) => {
    const nested = p?.["price(in Rs"]?.[")"];
    const flat = p?.["price(in Rs"];
    const raw = p?.price ?? nested ?? flat;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  // ✅ Main loader (stable, no dependency loops)
  const load = React.useCallback(async (query = "", pageNum = 1) => {
    const t = String(query || "").trim();
    setLoading(true);
    setErr("");

    try {
      const res = await api.get("/products", {
        params: { q: t, page: pageNum, limit: LIMIT },
      });

      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setItems(list);

      // expect object: { items, page, limit, total, pages }
      if (!Array.isArray(data)) {
        setPage(data?.page ?? pageNum);
        setTotal(data?.total ?? 0);
        setPages(data?.pages ?? 1);
      } else {
        // fallback
        setPage(pageNum);
        setTotal(0);
        setPages(1);
      }
    } catch (e) {
      console.error(e);
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Cannot load products (check backend + CORS)"
      );
      setItems([]);
      setTotal(0);
      setPage(1);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  React.useEffect(() => {
    load("", 1);
  }, [load]);

  // Search handlers
  const doSearch = () => load(q, 1);

  const doReset = () => {
    setQ("");
    load("", 1);
  };

  const canNext = page < pages;

  const createProduct = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      await api.post("/products", {
        title: title.trim(),
        category: category.trim(),
        price: Number(price),
        stock: Number(stock),
        imageUrl: imageUrl.trim(),
      });

      setTitle("");
      setCategory("");
      setImageUrl("");
      setPrice("");
      setStock("");

      await load(q, 1);
    } catch (e2) {
      console.error(e2);
      setErr(e2?.response?.data?.message || e2?.message || "Create failed");
    }
  };

  return (
    <div className="grid2">
      {/* LEFT: Products list */}
      <div className="card">
        <div className="h1">Products</div>
        <div className="sub">Browse products like a marketplace</div>

        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="searchInput"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />

          <button className="btn primary" onClick={doSearch}>
            Search
          </button>

          <button className="btn" onClick={doReset}>
            Reset
          </button>
        </div>

        {err && (
          <div className="msgErr" style={{ marginBottom: 12 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div className="small">Loading...</div>
        ) : items.length === 0 ? (
          <div className="small">No products found.</div>
        ) : (
          <>
            <div className="productGrid">
              {items.map((p) => {
                const titleText = getTitle(p);
                const img = getImage(p);
                const priceNum = getPrice(p);

                return (
                  <div className="productCard" key={p._id}>
                    <div className="productImg">
                      {img ? (
                        <img
                          src={img}
                          alt={titleText}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            borderRadius: 18,
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 800 }}>
                          {(titleText?.slice(0, 1) || "P").toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="productBody">
                      <div className="title">{titleText}</div>

                      <div className="meta">
                        <span>Category: {p.category || "-"}</span>
                        <span className="stock">Stock: {p.stock ?? "-"}</span>
                      </div>

                      <div className="priceRow">
                        <div className="price">₹{priceNum.toLocaleString()}</div>
                        <div className="small">Local demo</div>
                      </div>

                      <div className="actions">
                        <button
                          className="btn primary"
                          disabled={(p.stock ?? 0) <= 0}
                          onClick={() => {
                            addToCart(p, 1);
                            nav("/cart");
                          }}
                        >
                          Add to cart
                        </button>

                        <button
                          className="btn"
                          onClick={() => nav(`/products/${p._id}`)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn"
                disabled={page <= 1}
                onClick={() => load(q, page - 1)}
              >
                Prev
              </button>

              <div className="small">
                Page {page} / {pages} • Total: {total}
              </div>

              <button
                className="btn"
                disabled={!canNext}
                onClick={() => load(q, page + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Create product */}
      <div className="card">
        <div className="h2">Create product</div>

        {canManage ? (
          <form onSubmit={createProduct}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
              />

              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                required
              />

              <input
                className="input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL (https://...jpg/png/webp)"
              />

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="preview"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}

              <div className="formRow">
                <input
                  className="input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  required
                />
                <input
                  className="input"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Stock"
                  required
                />
              </div>

              <button className="btn primary" type="submit">
                Create
              </button>

              <div className="small">Seller/Admin only</div>
            </div>
          </form>
        ) : (
          <div className="small">
            Login as <b>seller</b> or <b>admin</b> to create products.
          </div>
        )}
      </div>
    </div>
  );
}
