#!/usr/bin/env node

/**
 * Script to apply database schema updates to a Supabase database
 * 
 * Usage:
 * 1. node scripts/apply-schema-updates.js
 * or
 * 2. npm run db:schema -- (if added to package.json scripts)
 * 
 * Environment variables:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - DB_SCHEMA_PATH: Path to schema file (default: db/schema-updates.sql)
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
/* eslint-enable @typescript-eslint/no-var-requires */

// Verify environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('- SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) console.error('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ADMIN_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Path to the schema file - check for existence in both the current directory and the parent directory
const schemaFilePathCurrent = path.join(__dirname, '..', 'db', 'schema-updates.sql');
const schemaFilePathParent = path.join(__dirname, '..', '..', 'db', 'schema-updates.sql');

let schemaFilePath;
if (fs.existsSync(schemaFilePathCurrent)) {
  schemaFilePath = schemaFilePathCurrent;
} else if (fs.existsSync(schemaFilePathParent)) {
  schemaFilePath = schemaFilePathParent;
} else {
  schemaFilePath = process.env.DB_SCHEMA_PATH;
  if (!schemaFilePath || !fs.existsSync(schemaFilePath)) {
    console.error(`Schema file not found. Checked paths:`);
    console.error(`- ${schemaFilePathCurrent}`);
    console.error(`- ${schemaFilePathParent}`);
    if (schemaFilePath) console.error(`- ${schemaFilePath}`);
    process.exit(1);
  }
}

/**
 * Apply the schema updates to the database
 */
async function applySchema() {
  try {
    console.log(`Reading schema file: ${schemaFilePath}`);
    
    // Read the schema file
    const sqlContent = fs.readFileSync(schemaFilePath, 'utf8');
    
    console.log(`Applying schema updates to ${supabaseUrl}...`);
    
    // Execute the SQL in chunks to avoid large payload errors
    const chunks = chunkSQL(sqlContent, 10000);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Executing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: chunk });
        
        if (error) {
          console.error(`Error applying schema chunk ${i + 1}:`, error);
          process.exit(1);
        }
      } catch (err) {
        console.error(`Error in chunk ${i + 1}:`, err.message);
        process.exit(1);
      }
    }
    
    console.log('Schema updates applied successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * Split SQL into chunks that are small enough to process
 * Attempts to keep statements intact when possible
 */
function chunkSQL(sql, maxChunkSize) {
  // Split on semicolons but keep them in the result
  const statements = sql.split(/(?<=;)/g);
  const chunks = [];
  let currentChunk = '';
  
  for (const statement of statements) {
    // If adding this statement would exceed the chunk size and there's already content in the current chunk
    if (currentChunk.length + statement.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = statement;
    } else {
      currentChunk += statement;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Run the script
applySchema(); 