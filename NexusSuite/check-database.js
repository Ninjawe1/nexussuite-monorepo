// Script to check database for existing contracts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { contracts } from './shared/schema.js';

const sqlite = new Database('./database.db');
const db = drizzle(sqlite);

async function checkContracts() {
  try {
    console.log('Checking database for contracts...');
    
    const allContracts = await db.select().from(contracts);
    console.log(`Found ${allContracts.length} contracts in database:`);
    
    if (allContracts.length > 0) {
      allContracts.forEach((contract, index) => {
        console.log(`\nContract ${index + 1}:`);
        console.log(`  ID: ${contract.id}`);
        console.log(`  File Name: ${contract.fileName}`);
        console.log(`  Type: ${contract.type}`);
        console.log(`  Linked Person: ${contract.linkedPerson}`);
        console.log(`  Expiration Date: ${contract.expirationDate}`);
        console.log(`  Status: ${contract.status}`);
        console.log(`  Tenant ID: ${contract.tenantId}`);
        console.log(`  Created At: ${contract.createdAt}`);
      });
    } else {
      console.log('No contracts found in database.');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    sqlite.close();
  }
}

checkContracts();