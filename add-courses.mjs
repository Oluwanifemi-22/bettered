import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.local") });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const courses = [
  { courseName: "CS 106A", syllabusText: "Programming Methodology", collaborationAllowed: true },
  { courseName: "CS 106B", syllabusText: "Programming Abstractions", collaborationAllowed: true },
  { courseName: "CS 107", syllabusText: "Computer Organization and Systems", collaborationAllowed: true },
  { courseName: "CS 107E", syllabusText: "Computer Organization from the Ground Up", collaborationAllowed: true },
  { courseName: "CS 109", syllabusText: "Data Science", collaborationAllowed: true },
  { courseName: "CS 111", syllabusText: "Operating Systems Principles", collaborationAllowed: true },
  { courseName: "CS 103", syllabusText: "Mathematical Foundations of Computing", collaborationAllowed: true },
  { courseName: "CS 161", syllabusText: "Design of Usable and Secure Interactive Systems", collaborationAllowed: true },
];

async function addCourses() {
  const coursesRef = collection(db, "courses");
  
  for (const course of courses) {
    try {
      const docRef = await addDoc(coursesRef, course);
      console.log(`✓ Added ${course.courseName} (ID: ${docRef.id})`);
    } catch (error) {
      console.error(`✗ Failed to add ${course.courseName}:`, error);
    }
  }
  
  console.log("\nDone!");
  process.exit(0);
}

addCourses();
