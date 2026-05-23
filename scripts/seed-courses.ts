import { collection, addDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";

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

export async function seedCourses() {
  const coursesRef = collection(db, "courses");
  
  for (const course of courses) {
    try {
      const docRef = await addDoc(coursesRef, course);
      console.log(`✓ Added ${course.courseName} (ID: ${docRef.id})`);
    } catch (error) {
      console.error(`✗ Failed to add ${course.courseName}:`, error);
    }
  }
}
