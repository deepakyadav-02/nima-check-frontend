import {
  normalizeDeptKey,
  getPGRowMarks,
  sumPGTotals,
  toNum,
  isGeologySem4Paper44,
  getGeologyPaper44EndSemMs,
  isCommerceSem4ProjectPaper,
  getCommerceProjectEndSemMs,
} from './marksheetUtils';

const SEMESTER_TITLES = [
  'FIRST SEMESTER EXAMINATION',
  'SECOND SEMESTER EXAMINATION',
  'THIRD SEMESTER EXAMINATION',
  'FOURTH SEMESTER EXAMINATION',
];

const STATIC_COLLEGE = {
  name: 'NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA',
  affiliation: '(Affiliated to Utkal University, Odisha)',
  examTitle: 'MARK SHEET CUM GRADE SHEET',
  examType: 'POST GRADUATE DEGREE EXAMINATION - 2025',
  slNo: '',
};

export function buildPGCourseLine(departmentOrCourse, userCourse) {
  const fromUser = userCourse != null ? String(userCourse).trim() : '';
  if (fromUser && fromUser.length > 3) return fromUser;

  const raw = departmentOrCourse == null ? '' : String(departmentOrCourse).trim();
  const u = raw.toUpperCase();
  if (!u) return 'POST GRADUATE PROGRAMME';
  if (u.includes('ODIA')) return 'MASTER OF ARTS IN ODIA';
  if (u.includes('COMMERCE')) return 'MASTER IN COMMERCE';
  if (u.includes('CHEM')) return 'MASTER OF SCIENCE IN CHEMISTRY';
  if (u.includes('GEO')) return 'MASTER OF SCIENCE IN GEOLOGY';
  if (u.includes('MATH')) return 'MASTER OF SCIENCE IN MATHEMATICS';
  return `MASTER OF SCIENCE IN ${u}`;
}

const subjectToCourse = (subject) => ({
  paperCode: subject.paper?.code ?? subject.paperCode ?? subject.courseType ?? '',
  paperName: subject.paper?.title ?? subject.paperName ?? subject.subjectName ?? '',
  subjectName: subject.paper?.title ?? subject.paperName ?? subject.subjectName ?? '',
  courseType: subject.paper?.code ?? subject.courseType ?? subject.paperCode ?? '',
  credit: toNum(subject.credit),
  midsem: toNum(subject.midsemMark ?? subject.midsem),
  endsem: toNum(subject.finalMark ?? subject.final),
  practical: toNum(subject.practicalMark ?? subject.practical),
  marks: toNum(subject.marks ?? subject.totalMark),
  grade: subject.grade || '',
  gradePoint: toNum(subject.gradePoint),
  creditPoint: toNum(subject.creditPoint),
});

const formatFullMark = (marks, deptKey) => {
  if (marks.midFm === '' || marks.midFm == null) {
    return marks.endFm != null && marks.endFm !== '' ? String(marks.endFm) : '50';
  }
  return `${marks.midFm}+${marks.endFm}`;
};

const mapSubjectToPaper = (subject, deptKey, semesterIndex) => {
  const course = subjectToCourse(subject);
  const marks = getPGRowMarks(course, deptKey, { semesterIndex });
  const credit = course.credit;
  const gp = course.gradePoint;
  const cp =
    course.creditPoint != null
      ? course.creditPoint
      : credit != null && gp != null
        ? credit * gp
        : '';

  let endSem = marks.endMs === '' || marks.endMs == null ? '' : marks.endMs;
  if (isGeologySem4Paper44(course, deptKey, semesterIndex)) {
    const practicalEnd = getGeologyPaper44EndSemMs(course);
    if (practicalEnd !== '') endSem = practicalEnd;
  }
  if (isCommerceSem4ProjectPaper(course, deptKey, semesterIndex)) {
    const projectEnd = getCommerceProjectEndSemMs(course);
    if (projectEnd !== '') endSem = projectEnd;
  }

  return {
    code: course.paperCode || course.courseType || '—',
    title: (course.paperName || course.subjectName || '').toUpperCase(),
    fullMark: formatFullMark(marks, deptKey),
    midSem: marks.midMs === '' || marks.midMs == null ? '' : marks.midMs,
    endSem,
    tot: marks.totalMs === '' ? '' : marks.totalMs,
    cr: credit != null ? credit : '',
    gr: course.grade || '',
    gp: gp != null ? gp : '',
    cp: cp !== '' ? cp : '',
  };
};

const mapSemesterBlock = (semBlock, semIndex, deptKey) => {
  const subjects = Array.isArray(semBlock?.subjects) ? semBlock.subjects : [];
  if (subjects.length === 0) return null;

  const courses = subjects.map(subjectToCourse);
  const papers = subjects.map((s) => mapSubjectToPaper(s, deptKey, semIndex));
  const totals = sumPGTotals(courses, deptKey, { semesterIndex: semIndex });

  const totalCr = courses.reduce((s, c) => s + (toNum(c.credit) ?? 0), 0);
  const totalCp = courses.reduce((s, c) => {
    const cp =
      c.creditPoint != null
        ? c.creditPoint
        : c.credit != null && c.gradePoint != null
          ? c.credit * c.gradePoint
          : 0;
    return s + (toNum(cp) ?? 0);
  }, 0);

  const storedSgpa = toNum(semBlock?.sgpa);
  const computedSgpa =
    totalCr > 0 ? Number((totalCp / totalCr).toFixed(2)) : null;
  const sgpa =
    storedSgpa != null
      ? String(storedSgpa)
      : computedSgpa != null
        ? String(computedSgpa)
        : '—';

  const semGrand = toNum(semBlock?.grandTotal ?? semBlock?.totalMarks);

  return {
    title: SEMESTER_TITLES[semIndex] || `SEMESTER ${semIndex + 1} EXAMINATION`,
    papers,
    total: {
      fullMark: totals.totalFm || semGrand || '',
      midSem: totals.midMs || '',
      endSem: totals.endMs || '',
      tot: totals.totalMs || semGrand || '',
      cr: totalCr || '',
      cp: totalCp || '',
    },
    sgpa,
    _meta: { totalCr, totalCp, classification: semBlock?.classification || '' },
  };
};

const computeOverallCgpa = (semesters) => {
  let credits = 0;
  let creditPoints = 0;
  for (const sem of semesters) {
    if (!sem?._meta) continue;
    credits += sem._meta.totalCr || 0;
    creditPoints += sem._meta.totalCp || 0;
  }
  if (credits > 0) {
    return Number((creditPoints / credits).toFixed(2));
  }

  const sgpas = semesters
    .map((s) => toNum(s?.sgpa))
    .filter((n) => n != null);
  if (sgpas.length === 0) return null;
  return Number((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2));
};

const pickResult = (api, semesters) => {
  const sem4 = semesters[3];
  const fromSem4 = sem4?._meta?.classification;
  if (fromSem4) return String(fromSem4).toUpperCase();

  for (let i = semesters.length - 1; i >= 0; i -= 1) {
    const c = semesters[i]?._meta?.classification;
    if (c) return String(c).toUpperCase();
  }

  const pct = toNum(api?.percentage);
  if (pct == null) return '—';
  if (pct >= 60) return '1ST CLASS';
  if (pct >= 50) return '2ND CLASS';
  return 'PASS';
};

/**
 * Map GET /api/pg/all-semesters response → FinalGradeSheet UI model.
 */
export function mapPGAllSemestersToGradeSheet(api, user = null) {
  if (!api || typeof api !== 'object') {
    throw new Error('Invalid grade sheet data');
  }

  const deptKey = normalizeDeptKey(api.department || api.course);
  const semKeys = ['sem1', 'sem2', 'sem3', 'sem4'];
  const rawSemesters = semKeys
    .map((key, i) => mapSemesterBlock(api.semesters?.[key], i, deptKey))
    .filter(Boolean);

  const semesters = rawSemesters.map(({ _meta, ...rest }) => rest);

  const cgpaFromSem = computeOverallCgpa(rawSemesters);
  const cgpa = cgpaFromSem != null ? String(cgpaFromSem) : '—';

  const userCourse =
    user?.Course || user?.course || user?.department || user?.Department;

  return {
    college: { ...STATIC_COLLEGE },
    student: {
      name: (api.studentName || user?.name || user?.['Name of the Students'] || '—').toUpperCase(),
      regdNo: api.registrationNumber || user?.registrationNumber || user?.['Registration Number'] || '—',
      rollNo: api.autonomousRollNo || user?.autonomousRollNo || user?.['Autonomous Roll No'] || '—',
      course: buildPGCourseLine(api.department || api.course, userCourse),
    },
    semesters,
    summary: {
      grandTotal: toNum(api.grandTotal) ?? api.grandTotal ?? '—',
      maximumMark: api.maximumMark ?? '—',
      cgpa,
      result: pickResult(api, rawSemesters),
      dateOfPublication: '02/07/2025',
    },
  };
}
