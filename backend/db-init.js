/**
 * Database initialization script for Hall Booking System
 * This script creates the database and collections if they don't exist
 * and sets up proper indexes and schema validation
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  console.error('DB_URL not set in environment');
  process.exit(1);
}

// Collection schemas based on usage analysis
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
const defaultBlocks = ["A", "B", "C", "D", "PG", "E", "PEB", "MBA"];

async function initializeDatabase() {
  const client = new MongoClient(dbUrl);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db("hallbooking");
    console.log('Using database:', db.databaseName);

    // Create or update collections with schemas
    for (const [collName, schema] of Object.entries(schemas)) {
      try {
        // Check if collection exists
        const collections = await db.listCollections({ name: collName }).toArray();
        
        if (collections.length === 0) {
          // Collection doesn't exist, create it with schema validation
          console.log(`Creating collection: ${collName}`);
          await db.createCollection(collName, { validator: schema.validator });
          
          // Initialize blocks collection with default blocks if it's the blocks collection
          if (collName === 'blocks') {
            await db.collection('blocks').updateOne(
              { _id: 'default_blocks' },
              { $set: { blocks: defaultBlocks } },
              { upsert: true }
            );
            console.log('Initialized blocks collection with default blocks');
          }
        } else {
          // Collection exists, update its schema validation
          console.log(`Updating schema for collection: ${collName}`);
          await db.command({
            collMod: collName,
            validator: schema.validator
          });
        }

        // Create indexes based on collection
        const collection = db.collection(collName);
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
        
        console.log(`Successfully set up collection: ${collName}`);
      } catch (err) {
        console.error(`Error setting up collection ${collName}:`, err);
      }
    }

    console.log('Database initialization completed');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    await client.close();
  }
}

// Run initialization
initializeDatabase().catch(console.error);