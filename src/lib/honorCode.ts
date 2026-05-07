// Keywords that indicate collaboration is prohibited
const PROHIBITED_KEYWORDS = [
  "no collaboration",
  "individual work",
  "not permitted",
  "work alone",
  "academic integrity",
];

export function parseSyllabusForCollaboration(syllabusText: string): boolean {
  const lower = syllabusText.toLowerCase();
  return !PROHIBITED_KEYWORDS.some((kw) => lower.includes(kw));
}
