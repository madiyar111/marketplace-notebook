import { requireAuth, requireRole } from "./auth.js";
export { requireAuth, requireRole };
export const protect = requireAuth;
