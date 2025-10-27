const express = require("express");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");

const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Helper to determine cookie options similar to other APIs
function determineCookieOptions(req) {
  let secure = false;
  let sameSite = "lax";
  try {
    const origin = req.headers && req.headers.origin;
    const hostHeader = req.headers && req.headers.host;
    const host = hostHeader ? hostHeader.split(":")[0] : null;
    if (origin) {
      const originHostname = new URL(origin).hostname;
      if (host && originHostname && originHostname !== host) {
        sameSite = "none";
        secure = true;
      } else {
        sameSite = "lax";
        secure = origin.startsWith("https:") || req.secure || (req.headers["x-forwarded-proto"] === "https");
      }
    } else {
      secure = req.secure || (req.headers && req.headers["x-forwarded-proto"] === "https") || (host && host !== 'localhost');
      sameSite = secure ? "none" : "lax";
    }
  } catch (err) {
    secure = false;
    sameSite = "lax";
  }
  return { secure, sameSite };
}

// Middleware to verify JWT token from HTTP-only cookie 'accessToken'
function verifyTokenFromCookie(req, res, next) {
  // Prefer cookie, fallback to Authorization header
  let token = req.cookies?.accessToken;
  if (!token) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Unauthorized: Invalid token" });
    }
    req.user = decoded; // attach decoded token payload to req.user
    next();
  });
}

function verifyToken(req, res, next) {
  // Accept token from cookie or Authorization header
  let token = req.cookies?.accessToken;
  if (!token) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    console.warn("No token provided");
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(403).send({ message: "Unauthorized: Invalid token" });
  }
}







// Protected route to get current authenticated user info
authRouter.get(
  "/current-user",
  verifyTokenFromCookie,
  expressAsyncHandler(async (req, res) => {
    const userEmail = req.user.email;
    const usersCollection = req.app.get("usersCollection");
    const adminCollection = req.app.get("adminCollection");

    // Try users collection first
    let user = null;

// Logout endpoint: clears cookies and removes refresh token from DB (if present)
authRouter.post(
  "/logout",
  expressAsyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies || {};
    const usersCollection = req.app.get("usersCollection");
    const adminCollection = req.app.get("adminCollection");

    // Try to remove refresh token from matching user/admin document
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const email = payload.email;
        if (usersCollection) {
          await usersCollection.updateOne({ email }, { $unset: { refreshToken: "" } });
        }
        if (adminCollection) {
          await adminCollection.updateOne({ email }, { $unset: { refreshToken: "" } });
        }
      } catch (err) {
        // ignore verification error — we still clear cookies
        console.warn("logout: refresh token verify failed", err.message);
      }
    }

    const cookieOpts = determineCookieOptions(req);
    // Clear cookies (path and sameSite/secure should match how they were set)
    res.clearCookie("accessToken", { path: "/", sameSite: cookieOpts.sameSite, secure: cookieOpts.secure });
    res.clearCookie("refreshToken", { path: "/", sameSite: cookieOpts.sameSite, secure: cookieOpts.secure });

    return res.send({ message: "Logged out" });
  })
);
    if (usersCollection) {
      user = await usersCollection.findOne({ email: userEmail });
      if (user) {
        delete user.password;
        // indicate type
        user.userType = "user";
        return res.send({ user });
      }
    }

    // Try admin collection as fallback
    if (adminCollection) {
      const admin = await adminCollection.findOne({ email: userEmail });
      if (admin) {
        delete admin.password;
        admin.userType = "admin";
        return res.send({ user: admin });
      }
    }

    return res.status(404).send({ message: "User not found" });
  })
);

module.exports = {
  authRouter,
  verifyTokenFromCookie,
  verifyToken,
};
