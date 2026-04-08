import config from '../config';

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

const normalizePGSecondSemRow = (row) => {
  if (!row || typeof row !== 'object') return null;

  // Already normalized (newer uploads)
  if (Array.isArray(row.courses)) return row;

  // Older export shape: { papers: { CODE: { subject, mid, end, TotalMark, Grade, "Grade Point", Credit, CP } } }
  const papers = row.papers && typeof row.papers === 'object' ? row.papers : null;
  if (!papers) return row;

  const courses = Object.entries(papers)
    .map(([code, p]) => {
      if (!p || typeof p !== 'object') return null;
      const credit = toNum(p.Credit ?? p.credit);
      const gradePoint = toNum(p['Grade Point'] ?? p.gradePoint);
      const creditPoint = toNum(p.CP ?? p.creditPoint ?? p['Credit Point']);
      const midsem = toNum(p.mid ?? p.Mid ?? p.internal);
      const endsem = toNum(p.end ?? p.End ?? p.theory);
      const marks = toNum(p.TotalMark ?? p.total ?? p.marks);

      return {
        subjectName: p.subject ?? p.Subject ?? code,
        courseType: code,
        credit: credit ?? 0,
        midsem: midsem ?? 0,
        endsem: endsem ?? 0,
        practical: toNum(p.practical) ?? 0,
        marks: marks ?? 0,
        grade: p.Grade ?? p.grade ?? '',
        gradePoint: gradePoint ?? 0,
        creditPoint: creditPoint ?? (credit != null && gradePoint != null ? credit * gradePoint : 0),
      };
    })
    .filter(Boolean);

  const totalCredits = courses.reduce((s, c) => s + (typeof c.credit === 'number' ? c.credit : 0), 0);
  const totalCreditPoints = courses.reduce(
    (s, c) => s + (typeof c.creditPoint === 'number' ? c.creditPoint : 0),
    0
  );
  const sgpa = totalCredits > 0 ? Number((totalCreditPoints / totalCredits).toFixed(2)) : 0;

  return {
    ...row,
    autonomousRollNo: row.autonomousRollNo ?? row['Autonomous Roll No'] ?? '',
    collegeRollNo: row.collegeRollNo ?? row['College Roll No'] ?? row['Roll No'] ?? '',
    applicantName: row.applicantName ?? row['Name of the Students'] ?? row.Name ?? '',
    department: row.department ?? row.Department ?? row.course ?? row.Course ?? '',
    classification: row.classification ?? row.Classification ?? '',
    percentage: toNum(row.percentage ?? row.Percentage) ?? row.percentage ?? row.Percentage,
    semester: row.semester ?? 2,
    courses,
    totalCredits: row.totalCredits ?? totalCredits,
    totalCreditPoints: row.totalCreditPoints ?? totalCreditPoints,
    sgpa: row.sgpa ?? sgpa,
  };
};

export const fetchPGSecondSem2024ByRollNo = async (rollNo, alternateRollNo) => {
  const primary = rollNo != null ? String(rollNo).trim() : '';
  const alternate = alternateRollNo != null ? String(alternateRollNo).trim() : '';

  if (!primary && !alternate) {
    throw new Error('Roll number is required');
  }

  const tryFetch = async (key) => {
    const url = `${config.API_BASE_URL}${config.API_ENDPOINTS.PG_SECOND_SEM_2024}/autonomous/${encodeURIComponent(
      key
    )}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      // If backend returns 404 for “not found”, treat as “no row” (not a fatal error).
      if (response.status === 404) return null;
      throw new Error(data.message || 'Failed to fetch PG 2nd sem result');
    }

    // Backend can return { pgSecondSem2024 } or the row directly
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const row = data.pgSecondSem2024 ?? data;
      return normalizePGSecondSemRow(row);
    }
    return null;
  };

  const primaryResult = primary ? await tryFetch(primary) : null;
  if (primaryResult) return primaryResult;

  if (alternate && alternate !== primary) {
    const altResult = await tryFetch(alternate);
    if (altResult) return altResult;
  }

  return null;
};

/**
 * Fetch marksheets for a student by their autonomous roll number
 * @param {string} autonomousRollNo - The autonomous roll number of the student
 * @returns {Promise<{marksheets: Array, studentInfo: Object}>} - Returns marksheets array and student info
 * @throws {Error} - Throws error if fetch fails
 */
export const fetchMarksheetsByRollNo = async (autonomousRollNo) => {
  if (!autonomousRollNo) {
    throw new Error('Autonomous roll number is required');
  }

  const url = `${config.API_BASE_URL}/marksheet/autonomous/${autonomousRollNo}`;
  console.log('🔍 Fetching from URL:', url);
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('🔍 Response status:', response.status);
  console.log('🔍 Response data:', data);
  console.log('🔍 Is Array?', Array.isArray(data));
  console.log('🔍 data.marksheets exists?', !!data.marksheets);
  console.log('🔍 data.student exists?', !!data.student);

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch marksheets');
  }

  // Handle both response formats: Array directly OR {student, marksheets}
  let marksheetsArray = [];
  let studentData = null;
  const secondSem2024 = Array.isArray(data) ? null : (data?.secondSem2024 || null);
  let pgSecondSem2024 = Array.isArray(data) ? null : (data?.pgSecondSem2024 || null);
  pgSecondSem2024 = pgSecondSem2024 ? normalizePGSecondSemRow(pgSecondSem2024) : null;
  
  if (Array.isArray(data)) {
    console.log('📌 Response is an array, using it directly');
    marksheetsArray = data;
    // Extract student data from first marksheet's populated field
    if (data.length > 0 && data[0].student) {
      const populatedStudent = data[0].student;
      console.log('📌 Populated student object:', populatedStudent);
      console.log('🔍 ABC_ID check:', {
        'ABC_ID (bracket)': populatedStudent['ABC_ID'],
        'ABC_ID (dot)': populatedStudent.ABC_ID,
        'abcId': populatedStudent.abcId,
        'All keys': Object.keys(populatedStudent)
      });
      
      const extractedAbcId = populatedStudent['ABC_ID'] || populatedStudent.ABC_ID || populatedStudent.abcId || '';
      console.log('✅ Extracted ABC_ID:', extractedAbcId);
      
      studentData = {
        name: populatedStudent['Name of the Students'] || populatedStudent.name,
        autonomousRollNo: populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
        rollNo: populatedStudent['Roll No'] || populatedStudent.rollNo,
        department: populatedStudent.Department || populatedStudent.department,
        abcId: extractedAbcId
      };
    }
  } else if (data && typeof data === 'object' && !Array.isArray(data)) {
    console.log('📌 Response object (student + marksheets + optional secondSem2024)');
    marksheetsArray = Array.isArray(data.marksheets) ? data.marksheets : [];
    studentData = data.student ?? null;
    
    // Always check the nested student object for additional fields like ABC_ID
    if (marksheetsArray.length > 0 && marksheetsArray[0].student) {
      const populatedStudent = marksheetsArray[0].student;
      console.log('📌 Populated student object (from marksheets):', populatedStudent);
      console.log('🔍 ABC_ID check:', {
        'ABC_ID (bracket)': populatedStudent['ABC_ID'],
        'ABC_ID (dot)': populatedStudent.ABC_ID,
        'abcId': populatedStudent.abcId,
        'All keys': Object.keys(populatedStudent)
      });
      
      const extractedAbcId = populatedStudent['ABC_ID'] || populatedStudent.ABC_ID || populatedStudent.abcId || '';
      console.log('✅ Extracted ABC_ID:', extractedAbcId);
      
      // Merge top-level student data with populated student data
      studentData = {
        name: studentData?.name || populatedStudent['Name of the Students'] || populatedStudent.name,
        autonomousRollNo: studentData?.autonomousRollNo || populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
        rollNo: studentData?.rollNo || populatedStudent['Roll No'] || populatedStudent.rollNo,
        department: studentData?.department || populatedStudent.Department || populatedStudent.department,
        abcId: extractedAbcId // ABC_ID is only in nested student object
      };
    }
  }
  
  console.log('🔍 Marksheets found:', marksheetsArray.length);
  console.log('🔍 Student info:', studentData);
  console.log('🔍 Student info ABC_ID:', studentData?.abcId);
  console.log('🔍 First marksheet:', marksheetsArray[0]);

  // Fallback: if marksheet route didn’t include PG row, fetch from dedicated endpoint.
  if (!pgSecondSem2024) {
    try {
      // Try with autonomousRollNo first (UG-style), then retry using the student's rollNo if the PG dataset uses that key.
      pgSecondSem2024 = await fetchPGSecondSem2024ByRollNo(
        autonomousRollNo,
        studentData?.rollNo
      );
    } catch (e) {
      // Non-fatal: keep UG marksheets working even if PG fetch fails
      console.warn('PG 2nd sem fetch fallback failed:', e?.message || e);
    }
  }
  
  return {
    marksheets: marksheetsArray,
    studentInfo: studentData,
    secondSem2024,
    pgSecondSem2024
  };
};

