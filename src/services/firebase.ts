// src/services/firebase.ts
import firebase from 'firebase/compat/app'; // Using compat for Firebase v8 style
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
// import 'firebase/compat/storage'; // If you plan to use Firebase Storage
// import 'firebase/compat/functions'; // If you plan to use Firebase Functions
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration!
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  // measurementId: "G-YOUR_MEASUREMENT_ID" // Optional: if you use Google Analytics
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

const auth = firebase.auth();
const firestore = firebase.firestore();
// const storage = firebase.storage(); // Uncomment if using storage
// const functions = firebase.functions(); // Uncomment if using functions

// Example: Set persistence for auth (optional)
// auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
//   .then(() => {
//     // Existing and future Auth states are now persisted in the current
//     // session only. Closing the window clears any existing state even
//     // if a user forgets to sign out.
//     // ...
//     // New sign-in will be persisted with session persistence.
//     // return firebase.auth().signInWithEmailAndPassword(email, password);
//   })
//   .catch((error) => {
//     // Handle Errors here.
//     console.error("Error setting auth persistence: ", error.message);
//   });

export { firebase, auth, firestore /*, storage, functions */ };