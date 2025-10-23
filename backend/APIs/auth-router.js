const express = require("express");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");

const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token from HTTP-only cookie 'accessToken'
function verifyTokenFromCookie(req, res, next) {
  const token = req.cookies?.accessToken;
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
  const token = req.cookies?.accessToken;

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

    const user = await usersCollection.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    delete user.password; // remove sensitive info
    res.send({ user });
  })
);

module.exports = {
  authRouter,
  verifyTokenFromCookie,
  verifyToken,
};
