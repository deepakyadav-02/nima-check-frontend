export function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function normalizeDeptKey(v) {
  const s = v == null ? '' : String(v).toUpperCase();
  if (s.includes('CHEM')) return 'CHEMISTRY';
  if (s.includes('GEO')) return 'GEOLOGY';
  if (s.includes('MATH')) return 'MATH';
  if (s.includes('COMMERCE')) return 'COMMERCE';
  if (s.includes('ODIA')) return 'ODIA';
  return '';
}

export function getTheoryFullMarksByDept(deptKey) {
  if (deptKey === 'CHEMISTRY') return { midFm: 20, endFm: 50, totalFm: 70 };
  // GEOLOGY, MATH, COMMERCE, ODIA (and default)
  return { midFm: 30, endFm: 70, totalFm: 100 };
}

/**
 * PG FM/MS display helper.
 * - Practical-only: MID blank, END/TOTAL FM=50.
 * - Chemistry theory: MID 20, END 50, TOTAL 70.
 * - Other theory: MID 30, END 70, TOTAL 100.
 * - Chemistry ICP-II/OCP-II special case where practical marks are stored in endsem.
 */
export function getPGRowMarks(course, deptKey) {
  const mid = toNum(course?.midsem ?? course?.internal);
  const end = toNum(course?.endsem ?? course?.theory);
  const practical = toNum(course?.practical);
  const total = toNum(course?.marks);

  const subjectNameRaw = course?.subjectName != null ? String(course.subjectName).trim() : '';
  const subjectNameUpper = subjectNameRaw.toUpperCase();
  const forcePracticalOnlyDisplay = subjectNameUpper === 'ICP-II' || subjectNameUpper === 'OCP-II';

  const chemistryPracticalMarks =
    forcePracticalOnlyDisplay && (end ?? practical ?? mid ?? total) !== null
      ? end ?? practical ?? mid ?? total
      : null;

  const practicalMarks = chemistryPracticalMarks ?? (practical !== null && practical > 0 ? practical : null);

  const isPracticalOnly = forcePracticalOnlyDisplay || (practicalMarks !== null && practicalMarks > 0);
  if (isPracticalOnly) {
    return {
      midFm: '',
      midMs: '',
      endFm: 50,
      endMs: practicalMarks ?? '',
      totalFm: 50,
      totalMs: total ?? practicalMarks ?? '',
    };
  }

  const fm = getTheoryFullMarksByDept(deptKey);
  return {
    midFm: fm.midFm,
    midMs: mid ?? '',
    endFm: fm.endFm,
    endMs: end ?? '',
    totalFm: fm.totalFm,
    totalMs: total ?? '',
  };
}

export function sumPGTotals(courses, deptKey) {
  const totals = { midFm: 0, midMs: 0, endFm: 0, endMs: 0, totalFm: 0, totalMs: 0 };
  if (!Array.isArray(courses)) return totals;

  for (const c of courses) {
    const m = getPGRowMarks(c, deptKey);
    totals.midFm += toNum(m.midFm) ?? 0;
    totals.midMs += toNum(m.midMs) ?? 0;
    totals.endFm += toNum(m.endFm) ?? 0;
    totals.endMs += toNum(m.endMs) ?? 0;
    totals.totalFm += toNum(m.totalFm) ?? 0;
    totals.totalMs += toNum(m.totalMs) ?? 0;
  }
  return totals;
}

