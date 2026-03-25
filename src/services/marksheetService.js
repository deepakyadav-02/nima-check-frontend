import config from '../config';

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
  } else if (data.marksheets) {
    console.log('📌 Response has marksheets property');
    marksheetsArray = data.marksheets;
    studentData = data.student;
    
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
  
  return {
    marksheets: marksheetsArray,
    studentInfo: studentData
  };
};

export const fetchUGSecondSem2024ByRollNo = async (autonomousRollNo) => {
  if (!autonomousRollNo) {
    throw new Error('Autonomous roll number is required');
  }

  const url = `${config.API_BASE_URL}/ug-2ndsem2024/autonomous/${autonomousRollNo}`;
  console.log('🔍 Fetching 2nd sem from URL:', url);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch 2nd semester record');
  }

  return data;
};

