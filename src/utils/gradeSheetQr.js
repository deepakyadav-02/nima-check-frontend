import { getStudentId } from './studentId';

/** Public verify path — scannable without login. */
export const GRADE_SHEET_VERIFY_PATH = '/verify/grade-sheet';

export function getGradeSheetVerifyUrl(studentId) {
  const id = encodeURIComponent(String(studentId).trim());
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${GRADE_SHEET_VERIFY_PATH}/${id}`;
}

export function getGradeSheetQrUrlForUser(user) {
  const studentId = getStudentId(user);
  if (!studentId) return null;
  return getGradeSheetVerifyUrl(studentId);
}
