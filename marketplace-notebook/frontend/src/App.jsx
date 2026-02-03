// frontend/src/App.jsx
import React from "react";
import { Link, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { clearAuth, getUser } from "./auth";

import Products from "./pages/Products.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import Cart from "./pages/Cart.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import ManageProducts from "./pages/ManageProducts.jsx";
import AdminAnalytics from "./pages/AdminAnalytics.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

function TopBar() {
  const user = getUser();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = React.useState("");

  // Keep search box synced with URL
  React.useEffect(() => {
    const params = new URLSearchParams(loc.search);
    setQ(params.get("q") || "");
  }, [loc.search]);

  const goSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("page", "1");
    nav(`/products?${params.toString()}`);
  };

  return (
    <div className="topbar">
      <div className="topbarInner">
        <Link className="logo" to="/products">
  	<span className="dot" />
  		NovaCart
	</Link>


        <div className="navLinks">
          <Link to="/products">Products</Link>

          {user && <Link to="/cart">Cart</Link>}
          {user && <Link to="/my-orders">My Orders</Link>}

          {(user?.role === "seller" || user?.role === "admin") && (
            <Link to="/manage-products">Manage</Link>
          )}

          {user?.role === "admin" && <Link to="/analytics">Analytics</Link>}
        </div>

        <div className="searchWrap">
          <input
            className="searchInput"
            placeholder="Search products (like Amazon)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goSearch()}
          />
          <button className="btn primary" onClick={goSearch}>
            Search
          </button>
        </div>

        {user ? (
          <>
            <div className="userPill">
              {user.name} ({user.role})
            </div>
            <button
              className="btn"
              onClick={() => {
                clearAuth();
                nav("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="btn" to="/login">
              Login
            </Link>
            <Link className="btn primary" to="/register">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <div className="container">
        <Routes>
          {/* default */}
          <Route path="/" element={<Navigate to="/products" replace />} />

          {/* public */}
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* logged-in */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }
          />

          {/* seller/admin */}
          <Route
            path="/manage-products"
            element={
              <ProtectedRoute roles={["seller", "admin"]}>
                <ManageProducts />
              </ProtectedRoute>
            }
          />

          {/* admin */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<div className="card">Not found</div>} />
        </Routes>
      </div>
    </>
  );
}
