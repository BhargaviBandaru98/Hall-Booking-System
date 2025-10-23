/**
 * Idempotent script to insert one document per block into the 'blocks' collection.
 * Each block document will have _id set to the block letter (e.g., 'A') so re-running is safe.
 * Run with: node insert_blocks_docs.js
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
  const client = new MongoClient(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  try{
    await client.connect();
    const db = client.db('hallbooking');
    const blocksColl = db.collection('blocks');

    for (const b of blocks) {
      // Use block letter as _id so this is idempotent
      const res = await blocksColl.updateOne(
        { _id: b },
        { $setOnInsert: { name: b, createdAt: new Date() } },
        { upsert: true }
      );
      if (res.upsertedCount === 1) {
        console.log(`Inserted block document: ${b}`);
      } else {
        console.log(`Block document already exists: ${b}`);
      }
    }

    console.log('Block documents initialization complete.');
  }catch(err){
    console.error('Error inserting block documents:', err);
  }finally{
    await client.close();
  }
}

main();
