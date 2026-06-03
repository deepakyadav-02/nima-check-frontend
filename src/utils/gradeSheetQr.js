import { COLLEGE_TITLE_FULL } from '../constants/collegeHeader';

/** Public PG final grade sheet verify path (9-digit SL No; 2026 + 5 digits). */
export const PG_GRADE_SHEET_VERIFY_PATH = '/verify/pg-grade-sheet';

export const PG_YEAR_OF_PASSING = '2026';

const SL_NO_REGEX = /^2026\d{5}$/;

export function getPGGradeSheetVerifyUrl(gradeSheetSlNo) {
  const sl = String(gradeSheetSlNo || '').trim();
  if (!SL_NO_REGEX.test(sl)) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${PG_GRADE_SHEET_VERIFY_PATH}/${sl}`;
}

/** Map grade-sheet RESULT label to QR wording (e.g. FIRST CLASS → 1ST CLASS). */
export function formatResultForQr(result) {
  const s = String(result ?? '').trim().toUpperCase();
  if (s === 'FIRST CLASS') return '1ST CLASS';
  if (s === 'SECOND CLASS') return '2ND CLASS';
  if (s === 'FAIL') return 'FAIL';
  if (s === 'PASS') return 'PASS';
  return String(result ?? '').trim();
}

/**
 * Plain-text payload encoded in the grade sheet QR (shown when scanned).
 * Example:
 * Roll No: 181NAC23001,Name: SARGAM PATRA Mark Secured: 2126,1ST CLASS   ,Year of Passing : 2026 , NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA
 */
export function buildPGGradeSheetQrText({
  rollNo,
  name,
  markSecured,
  result,
  yearOfPassing = PG_YEAR_OF_PASSING,
  collegeName = COLLEGE_TITLE_FULL,
} = {}) {
  const roll = String(rollNo ?? '').trim();
  const studentName = String(name ?? '').trim().replace(/\s+/g, ' ');
  const marksRaw = markSecured;
  const marks =
    marksRaw != null && marksRaw !== '' && marksRaw !== '—' ? String(marksRaw).trim() : '';
  const resultLabel = formatResultForQr(result);

  if (!roll || !studentName || !marks) return null;

  return `Roll No: ${roll},Name: ${studentName} Mark Secured: ${marks},${resultLabel}   ,Year of Passing : ${yearOfPassing} , ${collegeName}`;
}
