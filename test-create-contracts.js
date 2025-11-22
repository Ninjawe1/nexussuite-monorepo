// Test script to create contracts with different expiration dates
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

// Test contracts with different expiration dates
const testContracts = [
  {
    fileName: "active_contract.pdf",
    fileUrl: "https://example.com/active.pdf",
    type: "Player",
    linkedPerson: "John Active",
    expirationDate: "2025-12-31", // Future date - should be active
    status: "active"
  },
  {
    fileName: "expiring_contract.pdf", 
    fileUrl: "https://example.com/expiring.pdf",
    type: "Staff",
    linkedPerson: "Jane Expiring",
    expirationDate: "2024-12-25", // Within 30 days - should be expiring
    status: "active"
  },
  {
    fileName: "expired_contract.pdf",
    fileUrl: "https://example.com/expired.pdf", 
    type: "Sponsor",
    linkedPerson: "Expired Corp",
    expirationDate: "2024-01-01", // Past date - should be expired
    status: "active"
  }
];

async function createContract(contract) {
  try {
    const response = await fetch(`${baseUrl}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contract)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`Failed to create contract ${contract.fileName}: ${error}`);
      return null;
    }
    
    const result = await response.json();
    console.log(`Created contract: ${contract.fileName} - Status: ${result.status}`);
    return result;
  } catch (error) {
    console.error(`Error creating contract ${contract.fileName}:`, error.message);
    return null;
  }
}

async function createAllContracts() {
  console.log('Creating test contracts...');
  
  for (const contract of testContracts) {
    await createContract(contract);
  }
  
  console.log('Finished creating contracts');
}

createAllContracts();