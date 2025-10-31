const exp = require('express');
const app = exp();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

require("dotenv").config();

const cors = require("cors");

// Simple request logger to aid debugging (prints method and path)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path} - Origin: ${req.headers.origin || '-'} Host: ${req.headers.host || '-'} `);
  next();
});

// Build CORS whitelist from defaults + FRONTEND_URL env var(s)
const defaultOrigins = [
  'https://vnr-campus-halls-booking.onrender.com',
  'https://hall-booking-system-kappa.vercel.app',
];

// Always allow common local dev origin
const localDevOrigins = ['http://localhost:3229', 'http://127.0.0.1:3229'];

// FRONTEND_URL can be a comma-separated list of origins
let envOrigins = [];
if (process.env.FRONTEND_URL) {
  envOrigins = process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);
}

// Combine and dedupe
const whitelist = Array.from(new Set([ ...defaultOrigins, ...envOrigins, ...localDevOrigins ]));

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

// Trust proxy headers (important when behind a reverse proxy/load balancer)
// so req.secure and x-forwarded-proto are set correctly for cookie decisions.
app.set('trust proxy', 1);

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
    // Reuse the same whitelist used by Express CORS above so Socket.io allows the same origins
    origin: whitelist,
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

const port = process.env.PORT || 6229;

// Schema definitions for collections
const schemas = {
  admin: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["email", "password", "name", "phone", "userType"],
        properties: {
          email: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
          },
          password: { bsonType: "string" },
          name: { bsonType: "string" },
          phone: { bsonType: "string", pattern: "^[0-9]{10}$" },
          altPhone: { bsonType: ["string", "null"], pattern: "^[0-9]{10}$" },
          manages: { 
            bsonType: "array",
            items: { bsonType: "string" }
          },
          userType: { enum: ["admin"] },
          refreshToken: { bsonType: ["string", "null"] },
          createdAt: { bsonType: "string" }
        }
      }
    }
  },
  users: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["email", "password", "firstname", "lastname", "phone", "userType"],
        properties: {
          email: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
          },
          password: { bsonType: "string" },
          firstname: { bsonType: "string" },
          lastname: { bsonType: "string" },
          phone: { bsonType: "string", pattern: "^[0-9]{10}$" },
          userType: { enum: ["user"] },
          verifyStatus: { bsonType: "bool" },
          activeStatus: { bsonType: "bool" },
          refreshToken: { bsonType: ["string", "null"] }
        }
      }
    }
  },
  halls: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "capacity", "location", "block"],
        properties: {
          name: { bsonType: "string" },
          capacity: { bsonType: "int" },
          location: { bsonType: "string" },
          block: { bsonType: "string" },
          description: { bsonType: "string" },
          blockStatus: { bsonType: "bool" },
          laptopCharging: { bsonType: "bool" },
          projectorAvailable: { bsonType: "bool" },
          projectorCount: { bsonType: "int" },
          image: { bsonType: ["string", "null"] }
        }
      }
    }
  },
  blocks: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["_id", "blocks"],
        properties: {
          _id: { bsonType: "string" },
          blocks: {
            bsonType: "array",
            items: { bsonType: "string" }
          }
        }
      }
    }
  },
  bookings: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["bookingID", "hallname", "bookingEmail", "date", "slot", "eventName"],
        properties: {
          bookingID: { bsonType: "int" },
          hallname: { bsonType: "string" },
          bookingEmail: { bsonType: "string" },
          date: { bsonType: "string" },
          slot: { bsonType: "string" },
          eventName: { bsonType: "string" },
          eventDescription: { bsonType: "string" },
          verifyStatus: { bsonType: "bool" },
          rejectStatus: { bsonType: "bool" },
          activeStatus: { bsonType: "bool" },
          dateOfBooking: { bsonType: "string" },
          formattedDate: { bsonType: "string" },
          rejectionNote: { bsonType: ["string", "null"] },
          rejectionNoteDate: { bsonType: ["string", "null"] },
          acceptanceNote: { bsonType: ["string", "null"] },
          acceptanceNoteDate: { bsonType: ["string", "null"] }
        }
      }
    }
  },
  announcements: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["title", "message", "validity", "createdAt"],
        properties: {
          title: { bsonType: "string" },
          message: { bsonType: "string" },
          validity: { bsonType: "int" },
          createdAt: {
            bsonType: "object",
            required: ["date", "time"],
            properties: {
              date: { bsonType: "string" },
              time: { bsonType: "string" }
            }
          }
        }
      }
    }
  }
};

// Default blocks to initialize
const defaultBlocks = ["A-Block", "B-Block", "C-Block", "D-Block", "PG-Block", "E-Block", "PEB-Block", "MBA-Block"];

// Connect to MongoDB and start server only after successful connection
mongoClient.connect(db_url)
  .then(async (client) => {
    const dbObj = client.db("hallbooking");
    console.log('Connected to MongoDB, checking collections...');

    // Initialize collections only if they don't exist
    for (const [collName, schema] of Object.entries(schemas)) {
      try {
        // Check if collection exists
        const collections = await dbObj.listCollections({ name: collName }).toArray();
        
        if (collections.length === 0) {
          console.log(`Collection '${collName}' not found, creating with schema...`);
          await dbObj.createCollection(collName, { validator: schema.validator });
          
          // Create indexes for new collection
          const collection = dbObj.collection(collName);
          switch (collName) {
            case 'admin':
            case 'users':
              await collection.createIndex({ email: 1 }, { unique: true });
              break;
            case 'halls':
              await collection.createIndex({ name: 1 }, { unique: true });
              await collection.createIndex({ block: 1 });
              break;
            case 'bookings':
              await collection.createIndex({ bookingID: 1 }, { unique: true });
              await collection.createIndex({ hallname: 1 });
              await collection.createIndex({ bookingEmail: 1 });
              await collection.createIndex({ date: 1, slot: 1 });
              break;
          }

          // Initialize blocks collection with default blocks if it's new
          if (collName === 'blocks') {
            await collection.updateOne(
              { _id: 'default_blocks' },
              { $set: { blocks: defaultBlocks } },
              { upsert: true }
            );
            console.log('Initialized new blocks collection with default blocks');
          }
          
          console.log(`Successfully created collection: ${collName}`);
        } else {
          console.log(`Collection '${collName}' already exists, skipping initialization`);
        }
      } catch (err) {
        console.error(`Error checking/creating collection ${collName}:`, err);
      }
    }

    // Set collections in app
    app.set("adminCollection", dbObj.collection("admin"));
    app.set("usersCollection", dbObj.collection("users"));
    app.set("hallsCollection", dbObj.collection("halls"));
    app.set("blocksCollection", dbObj.collection("blocks"));
    app.set("bookingsCollection", dbObj.collection("bookings"));
    app.set("announcementCollections", dbObj.collection("announcements"));
    
    console.log("All collections initialized successfully");

    // Start server and websocket
    server.listen(port, () => console.log(`HTTP server is running on port ${port}`));
    require("./websocket")(server, app);
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
  });
