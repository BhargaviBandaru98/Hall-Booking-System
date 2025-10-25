const exp = require('express');
const app = exp();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

require("dotenv").config();

const cors = require("cors");

// Whitelist of allowed origins (add env-defined frontend URL if present)
const whitelist = [
  'https://vnr-campus-halls-booking.onrender.com',
  'http://localhost:5173',
  'https://hall-booking-system-kappa.vercel.app',
];
if (process.env.FRONTEND_URL) whitelist.push(process.env.FRONTEND_URL);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or server-to-server)
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

// Apply CORS middleware and explicitly handle preflight requests
app.use(cors(corsOptions));

// Increase JSON body size limit to allow base64 image uploads from the frontend (e.g. booking poster)
// Default limit is small (~100kb). We allow up to 4mb here (adjust as needed).
app.use(exp.json({ limit: '4mb' }));
app.use(exp.urlencoded({ extended: true, limit: '4mb' }));

const userApp = require("./APIs/user-api.js");
const adminApp = require("./APIs/admin-api.js");
const { authRouter } = require("./APIs/auth-router.js"); // Adjust path as needed

// Mount route handlers
app.use("/user-api", userApp);
app.use("/admin-api", adminApp);
app.use("/auth", authRouter);

const mongoClient = require("mongodb").MongoClient;
const db_url = process.env.DB_URL;

const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    // Allow configured FRONTEND_URL (if set) plus Vercel deployment origin
    origin: [process.env.FRONTEND_URL, 'https://hall-booking-system-kappa.vercel.app'].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("Client connected via Socket.io:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
  socket.on("error", (err) => {
    console.error("⚠️ Socket.io Error:", err);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send({ errMessage: err.message });
});

const port = process.env.PORT || 4000;

// Connect to MongoDB and start server only after successful connection
mongoClient.connect(db_url)
  .then(client => {
    const dbObj = client.db("hallbooking");
    app.set("adminCollection", dbObj.collection("admin"));
    app.set("usersCollection", dbObj.collection("users"));
    app.set("hallsCollection", dbObj.collection("halls"));
  app.set("blocksCollection", dbObj.collection("blocks"));
    app.set("bookingsCollection", dbObj.collection("bookings"));
    app.set("announcementCollections", dbObj.collection("announcements"));
    console.log("MongoDB connected successfully");

    server.listen(port, () => console.log(`HTTP server is running on port ${port}`));

    // Start websocket after collections are ready
    require("./websocket")(server, app);
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
  });
