import { collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, Timestamp } from "firebase/firestore";
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

export async function getAllCourses(): Promise<CourseDoc[]> {
  const snapshot = await getDocs(coursesRef);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as CourseDoc))
    .sort((a, b) => a.courseName.localeCompare(b.courseName));
}

// Returns null if the course doesn't exist
export async function checkCollaborationAllowed(courseId: string): Promise<boolean | null> {
  const course = await getCourse(courseId);
  return course ? course.collaborationAllowed : null;
}

// --- Course Requests ---

export interface CourseRequest {
  id: string;
  uid: string;
  courseName: string;
  reason?: string;
  status: "pending" | "approved" | "denied";
  createdAt: Timestamp;
}

const courseRequestsRef = collection(db, "courseRequests");

export async function requestNewCourse(uid: string, courseName: string, reason?: string) {
  return addDoc(courseRequestsRef, {
    uid,
    courseName: courseName.trim(),
    reason: reason?.trim() ?? null,
    status: "pending",
    createdAt: Timestamp.now(),
  });
}

export async function getPendingCourseRequests(): Promise<CourseRequest[]> {
  const snap = await getDocs(query(courseRequestsRef, where("status", "==", "pending")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseRequest));
}

// Approves the request and creates the course in one step
export async function approveCourseRequest(requestId: string, collaborationAllowed: boolean): Promise<void> {
  const reqRef = doc(db, "courseRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Request not found");
  const { courseName } = reqSnap.data() as { courseName: string };
  await createCourse(courseName, "", collaborationAllowed);
  await updateDoc(reqRef, { status: "approved" });
}

export async function denyCourseRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "courseRequests", requestId), { status: "denied" });
}
