import { collection, doc, addDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const coursesRef = collection(db, "courses");

export async function createCourse(
  courseName: string,
  syllabusText: string,
  collaborationAllowed: boolean
) {
  return addDoc(coursesRef, { courseName, syllabusText, collaborationAllowed });
}

interface CourseDoc {
  id: string;
  courseName: string;
  syllabusText: string;
  collaborationAllowed: boolean;
}

export async function getCourse(courseId: string): Promise<CourseDoc | null> {
  const snap = await getDoc(doc(db, "courses", courseId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CourseDoc) : null;
}

function normalize(s: string) {
  return s.replace(/\s+/g, "").toLowerCase();
}

export async function getCourseByName(courseName: string): Promise<CourseDoc | null> {
  if (!courseName) return null;
  const normalizedInput = normalize(courseName);
  const snapshot = await getDocs(coursesRef);
  const match = snapshot.docs.find(
    (d) => normalize(d.data().courseName as string) === normalizedInput
  );
  return match ? ({ id: match.id, ...match.data() } as CourseDoc) : null;
}

// Returns null if the course doesn't exist
export async function checkCollaborationAllowed(courseId: string): Promise<boolean | null> {
  const course = await getCourse(courseId);
  return course ? course.collaborationAllowed : null;
}
