import { promises as fs } from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import path from 'path';

async function runMigration() {
  // Load environment variables
  config({ path: path.resolve(process.cwd(), '.env') });
  
  const connectionString = process.env.PGSQL_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('Error: PGSQL_CONNECTION_STRING not found in environment variables');
    process.exit(1);
  }
  
  // Create a new client
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');
    
    // Read the migration file
    const migrationFile = path.resolve(process.cwd(), 'db', 'remove_first_name.sql');
    const sql = await fs.readFile(migrationFile, 'utf8');
    
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await client.end();
  }
}

runMigration(); 