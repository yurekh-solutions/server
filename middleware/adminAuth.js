// Admin authentication middleware.
// Supports two modes (choose whichever is easier for your environment):
//
//   1. Static token header  →  x-admin-token: <ADMIN_API_TOKEN>
//      Useful for quickly wiring up a protected dashboard in dev.
//
//   2. JWT with userType === 'admin'
//      Reuses the normal app auth pipeline once you have real admin users.
//
// If neither credential is supplied (or both are invalid), returns 401.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function adminAuth(req, res, next) {
  try {
    // ── 1. Static admin token ─────────────────────────────────────────────
    const staticToken = process.env.ADMIN_API_TOKEN;
    const provided = req.headers['x-admin-token'];
    if (staticToken && provided && provided === staticToken) {
      req.admin = { mode: 'static' };
      return next();
    }

    // ── 2. JWT with admin role ────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.userType === 'admin') {
          req.admin = { mode: 'jwt', user };
          req.user = user;
          return next();
        }
      } catch {
        /* fall through */
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Admin authentication required',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Admin auth error',
      error: err.message,
    });
  }
};
