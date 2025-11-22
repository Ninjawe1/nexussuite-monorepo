// Import the functions you need from the Firebase SDKs
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, addDoc, getDocs, DocumentData } from 'firebase/firestore'; // Import Firestore types and functions

// Your web app's Firebase configuration
// PASTE YOUR firebaseConfig OBJECT HERE from Step 3
const firebaseConfig = {
  apiKey: "AIzaSyAxieQgkig2qZxhn7qMFzc8V0ccMEdm4no",
  authDomain: "esports-app-44b10.firebaseapp.com",
  projectId: "esports-app-44b10",
  storageBucket: "esports-app-44b10.appspot.com",
  messagingSenderId: "900773170575",
  appId: "1:900773170575:web:a2c2d758ea8dbe88464ffa",
  measurementId: "G-01HV6XFJH1" // Optional, if you have Analytics
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db: Firestore = getFirestore(app);

// Now 'db' is your reference to the Firestore database!
// You can use it to interact with your data.

// --- Example: Add and Read Data ---

// Function to add a new document
async function addSampleData(): Promise<void> {
  try {
    const docRef = await addDoc(collection(db, "myCollection"), {
      name: "Sample Item",
      description: "This is a test item from my local app!",
      timestamp: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
    alert("Sample data added! Check your console and Firestore.");
    displayData(); // Refresh displayed data
  } catch (e: any) { // Use 'any' for error type if unsure or polyfill isn't available
    console.error("Error adding document: ", e);
    alert("Error adding data.");
  }
}

// Function to read all documents from 'myCollection'
async function displayData(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, "myCollection"));
  const dataOutput = document.getElementById('data-output');
  if (!dataOutput) return; // Type guard for null element
  dataOutput.innerHTML = ''; // Clear previous data

  if (querySnapshot.empty) {
    dataOutput.textContent = "No data found yet. Click 'Add Sample Data'.";
    return;
  }

  querySnapshot.forEach((doc: DocumentData) => {
    // doc.data() is never undefined for query doc snapshots
    const data = doc.data();
    console.log(`${doc.id} => ${data.name}`);
    dataOutput.innerHTML += `<p>ID: ${doc.id}, Name: ${data.name}, Desc: ${data.description}</p>`;
  });
}

// Attach event listener to the button
document.getElementById('add-data-button')?.addEventListener('click', addSampleData);

// Display data when the page loads
displayData();