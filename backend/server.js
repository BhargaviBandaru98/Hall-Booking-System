const exp = require('express');
const app = exp();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

require("dotenv").config();

const cors = require("cors");

const corsOptions = {
  origin: [
    'https://vnr-campus-halls-booking.onrender.com',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};
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
    origin: process.env.FRONTEND_URL,
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
