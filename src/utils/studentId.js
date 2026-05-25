/**
 * Stable identifier for QR codes and verify URLs (one per logged-in student).
 */
export function getStudentId(user) {
  if (!user) return null;
  const id =
    user.autonomousRollNo ||
    user['Autonomous Roll No'] ||
    user.rollNo ||
    user['Roll No'] ||
    user['College Roll No'];
  if (!id) return null;
  return String(id).trim();
}

export function getStudentDisplayName(user) {
  if (!user) return 'Student';
  return (
    user.name ||
    user['Name of the Students'] ||
    user['Applicant Name'] ||
    getStudentId(user) ||
    'Student'
  );
}
