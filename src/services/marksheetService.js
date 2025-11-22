import config from '../config';

// Frontend cache for marksheet data (5 minutes TTL)
const marksheetCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch marksheets for a student by their autonomous roll number
 * @param {string} autonomousRollNo - The autonomous roll number of the student
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data
 * @returns {Promise<{marksheets: Array, studentInfo: Object}>} - Returns marksheets array and student info
 * @throws {Error} - Throws error if fetch fails
 */
export const fetchMarksheetsByRollNo = async (autonomousRollNo, forceRefresh = false) => {
  if (!autonomousRollNo) {
    throw new Error('Autonomous roll number is required');
  }

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cacheKey = `marksheet_${autonomousRollNo}`;
    const cached = marksheetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Using cached marksheet data for:', autonomousRollNo);
      return cached.data;
    }
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
        name: populatedStudent['Name of the Students'] || populatedStudent['Applicant Name'] || populatedStudent.name,
        autonomousRollNo: populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
        rollNo: populatedStudent['Roll No'] || populatedStudent['College Roll No'] || populatedStudent.rollNo,
        department: populatedStudent.Department || populatedStudent.Course || populatedStudent.department,
        studentType: populatedStudent.studentType || data.student?.studentType,
        abcId: extractedAbcId
      };
    }
  } else if (data.marksheets) {
    console.log('📌 Response has marksheets property');
    marksheetsArray = data.marksheets;
    studentData = data.student || {};
    
    console.log('📌 Top-level student data:', studentData);
    console.log('📌 Top-level studentType:', studentData?.studentType);
    
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
      // IMPORTANT: Preserve studentType from top-level data.student (it's not in populated student)
      studentData = {
        name: studentData?.name || populatedStudent['Name of the Students'] || populatedStudent['Applicant Name'] || populatedStudent.name,
        autonomousRollNo: studentData?.autonomousRollNo || populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
        rollNo: studentData?.rollNo || populatedStudent['Roll No'] || populatedStudent['College Roll No'] || populatedStudent.rollNo,
        department: studentData?.department || populatedStudent.Department || populatedStudent.Course || populatedStudent.department,
        studentType: studentData?.studentType || data.student?.studentType, // Preserve from top-level response
        abcId: extractedAbcId // ABC_ID is only in nested student object
      };
      
      console.log('✅ Merged studentData with studentType:', studentData.studentType);
    } else {
      // If no populated student, ensure studentType is preserved
      if (data.student?.studentType && !studentData?.studentType) {
        studentData.studentType = data.student.studentType;
        console.log('✅ Set studentType from data.student:', studentData.studentType);
      }
    }
  }
  
  console.log('🔍 Marksheets found:', marksheetsArray.length);
  console.log('🔍 Student info:', studentData);
  console.log('🔍 Student info ABC_ID:', studentData?.abcId);
  console.log('🔍 Student Type:', studentData?.studentType);
  console.log('🔍 First marksheet:', marksheetsArray[0]);
  
  if (marksheetsArray.length > 0) {
    const firstMarksheet = marksheetsArray[0];
    console.log('🔍 First marksheet courses:', firstMarksheet.courses?.length || 0);
    console.log('🔍 First marksheet course types:', firstMarksheet.courses?.map(c => c.courseType) || []);
    console.log('🔍 First marksheet studentType:', firstMarksheet.studentType);
    console.log('🔍 First marksheet department:', firstMarksheet.department);
  }
  
  if (marksheetsArray.length === 0) {
    console.warn('⚠️ No marksheets returned from API');
  }
  
  if (!studentData) {
    console.warn('⚠️ No student info returned from API');
  }
  
  const result = {
    marksheets: marksheetsArray,
    studentInfo: studentData
  };
  
  // Cache the result
  const cacheKey = `marksheet_${autonomousRollNo}`;
  marksheetCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries periodically (keep cache size manageable)
  if (marksheetCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of marksheetCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        marksheetCache.delete(key);
      }
    }
  }
  
  return result;
};

/**
 * Clear the marksheet cache for a specific roll number or all cache
 * @param {string} autonomousRollNo - Optional. If provided, clears only that entry. Otherwise clears all cache.
 */
export const clearMarksheetCache = (autonomousRollNo = null) => {
  if (autonomousRollNo) {
    const cacheKey = `marksheet_${autonomousRollNo}`;
    marksheetCache.delete(cacheKey);
    console.log('🗑️ Cleared cache for:', autonomousRollNo);
  } else {
    marksheetCache.clear();
    console.log('🗑️ Cleared all marksheet cache');
  }
};

