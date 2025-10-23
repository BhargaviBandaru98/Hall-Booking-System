/**
 * Script to create a 'blocks' collection (or document) with predefined blocks
 * Run with: node create_blocks.js
 * It reads DB_URL from environment or .env
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  console.error('DB_URL not set in environment');
  process.exit(1);
}

const blocks = ["A","B","C","D","PG","E","PEB","MBA"];

async function main(){
  const client = new MongoClient(dbUrl);
  try{
    await client.connect();
    const db = client.db('hallbooking');
    const blocksColl = db.collection('blocks');

    // Upsert a single document that contains the list of blocks for easy querying
    await blocksColl.updateOne(
      { _id: 'default_blocks' },
      { $set: { blocks } },
      { upsert: true }
    );

    console.log('Blocks collection initialized with:', blocks);
  }catch(err){
    console.error('Error creating blocks:', err);
  }finally{
    await client.close();
  }
}

main();
