
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Removed sslmode=require from the string to let the object config handle it
const connectionString = "postgres://postgres.eqtgtvfgyimzbnipxawi:t2QO6ECbvxSTOrWj@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync(path.join('scripts', '007_add_explicit_upgrade_columns.sql'), 'utf8');
    await client.query(sql);
    console.log("Migration 007 applied successfully.");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

run();
