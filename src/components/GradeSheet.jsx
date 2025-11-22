import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import gradeSheetData from '../data/gradeSheetData.json';
import { fetchMarksheetsByRollNo } from '../services/marksheetService';
import './GradeSheet.css';

// Utility function to format date
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Utility function to check if student is PG
const checkIsPGStudent = (courses, studentType) => {
  if (studentType === 'PG' || studentType === 'PGStudent') return true;
  if (!courses || courses.length === 0) return false;
  return courses.some(course => 
    course?.courseType && (
      course.courseType.toUpperCase().startsWith('PAPER') ||
      /^[A-Z]{2,4}\d{3,4}$/i.test(course.courseType)
    )
  );
};

export default function GradeSheet({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(gradeSheetData);
  const [studentInfo, setStudentInfo] = useState(null);
  const [marksheetData, setMarksheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const gradeSheetRef = useRef(null);

  // OPTIMIZATION: Memoize PG student check to avoid recalculation on every render
  const isPGStudent = useMemo(() => {
    return marksheetData?.isPGStudent ||
           checkIsPGStudent(marksheetData?.courses, studentInfo?.studentType || user?.studentType) ||
           false;
  }, [marksheetData?.isPGStudent, marksheetData?.courses, studentInfo?.studentType, user?.studentType]);

  useEffect(() => {
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const autonomousRollNo = user?.autonomousRollNo || user?.['Autonomous Roll No'];
      
      if (!autonomousRollNo) {
        console.log('No autonomous roll number found, using default data');
        setLoading(false);
        return;
      }

      // Fetch marksheets data using the service
      const { marksheets, studentInfo: apiStudentInfo } = await fetchMarksheetsByRollNo(autonomousRollNo);
      
      console.log('📊 GradeSheet - Received data:', {
        marksheetsCount: marksheets?.length || 0,
        studentInfo: apiStudentInfo,
        firstMarksheet: marksheets?.[0]
      });
      
      if (apiStudentInfo && marksheets && marksheets.length > 0) {
        setStudentInfo(apiStudentInfo);
        const firstMarksheet = marksheets[0];
        
        // Store the marksheet data (courses, totals, sgpa)
        // Format createdAt date to DD/MM/YYYY
        const publicationDate = formatDate(firstMarksheet.createdAt) || data.publicationDate;
        
        // Check if PG student to determine what data to store
        const isPGStudent = checkIsPGStudent(
          firstMarksheet.courses, 
          apiStudentInfo?.studentType
        );

        setMarksheetData({
          courses: firstMarksheet.courses || [],
          totalCredits: firstMarksheet.totalCredits || 0,
          totalCreditPoints: firstMarksheet.totalCreditPoints || 0,
          sgpa: firstMarksheet.sgpa || 0,
          percentage: firstMarksheet.percentage || 0,
          marks: firstMarksheet.courses?.reduce((sum, course) => sum + (course.marks || 0), 0) || 0,
          publicationDate: publicationDate,
          classification: firstMarksheet.classification || 'N/A',
          isPGStudent: isPGStudent,
          department: firstMarksheet.department || null // Store department from marksheet if available
        });
        
        // Determine language based on department, course types, and subject names
        let language = 'ENGLISH';
        
        // Check if student is from ODIA department
        const department = firstMarksheet.department || apiStudentInfo?.department || apiStudentInfo?.Course || '';
        const departmentUpper = department.toUpperCase();
        const isOdiaDepartment = departmentUpper === 'ODIA' || departmentUpper.includes('ODIA');
        
        // Check College Roll No for ODIA prefix (e.g., ODIA24-001)
        const rollNo = apiStudentInfo?.rollNo || '';
        const isOdiaRollNo = rollNo.toUpperCase().startsWith('ODIA');
        
        // Check courses for ODIA indicators
        let hasOdiaCourse = false;
        if (firstMarksheet.courses && firstMarksheet.courses.length > 0) {
          // Check for ODIA in subject names
          hasOdiaCourse = firstMarksheet.courses.some(course => 
            course.subjectName && course.subjectName.toLowerCase().includes('odia')
          );
          
          // Check for PAPER course types (PG Odia students use PAPER1.1, PAPER1.2, etc.)
          const hasPaperCourse = firstMarksheet.courses.some(course => 
            course.courseType && course.courseType.toUpperCase().startsWith('PAPER')
          );
          
          // If has PAPER courses and department is ODIA, it's Odia student
          if (hasPaperCourse && isOdiaDepartment) {
            hasOdiaCourse = true;
          }
        }
        
        // Set language to odia if any Odia indicator is found
        if (isOdiaDepartment || isOdiaRollNo || hasOdiaCourse) {
          language = 'odia';
        }
        
        // Determine course info (CORE-1: MAJOR SUBJECT, CORE-2: MINOR SUBJECT)
        // Handle both UG and PG formats
        let courseInfo = data.studentInfo.course;
        let coreTwoInfo = data.studentInfo.coreTwo;
        const studentType = apiStudentInfo?.studentType || user?.studentType;

        if (firstMarksheet.courses && firstMarksheet.courses.length > 0) {
          // Check if this is PG student (has PAPER course types or MTC course codes)
          const isPGStudent = checkIsPGStudent(firstMarksheet.courses, studentType);

          if (isPGStudent) {
            // PG format: Map department to correct degree type
            // Priority: marksheet department > student department > student Course field
            let department = '';
            
            // First try to get from marksheet data (most reliable - stored from JSON)
            if (firstMarksheet.department) {
              department = firstMarksheet.department;
            } 
            // Then try student info department
            else if (apiStudentInfo?.department && apiStudentInfo.department !== 'N/A') {
              department = apiStudentInfo.department;
            } 
            // Then try student Course field
            else if (apiStudentInfo?.Course) {
              department = apiStudentInfo.Course;
            }
            // Try to infer from College Roll No (ODIA24-001 -> ODIA, MATH24-001 -> MATH, etc.)
            else if (apiStudentInfo?.rollNo) {
              const rollNoMatch = apiStudentInfo.rollNo.match(/^([A-Z]+)\d+/);
              if (rollNoMatch && rollNoMatch[1]) {
                department = rollNoMatch[1];
              }
            }
            
            // Clean department name - remove any extra text
            if (department) {
              // Remove text in parentheses (e.g., "odia(respected subject name)" -> "odia")
              department = department.replace(/\([^)]*\)/g, '').trim();
              // Remove "Course:" prefix if it's already there
              department = department.replace(/^Course:\s*/i, '').trim();
              // Remove any trailing spaces or special characters
              department = department.replace(/\s+/g, ' ').trim();
              // Capitalize properly
              department = department.toUpperCase();
            }
            
            // Final fallback
            if (!department) {
              department = 'POST GRADUATE';
            }
            
            // Map department to correct degree type
            // ODIA → MASTER OF ARTS
            // GEOLOGY, CHEMISTRY, MATHEMATICS, MATH → MASTER OF SCIENCE
            // COMMERCE → MASTER OF COMMERCE
            let degreeType = '';
            const deptUpper = department.toUpperCase();
            
            if (deptUpper === 'ODIA') {
              degreeType = 'MASTER OF ARTS';
            } else if (deptUpper === 'GEOLOGY' || deptUpper === 'CHEMISTRY' || deptUpper === 'CHEM' || 
                       deptUpper === 'MATHEMATICS' || deptUpper === 'MATH' || deptUpper === 'MATHS') {
              degreeType = 'MASTER OF SCIENCE';
            } else if (deptUpper === 'COMMERCE' || deptUpper === 'COM') {
              degreeType = 'MASTER OF COMMERCE';
            } else {
              // Default fallback
              degreeType = 'MASTER OF SCIENCE';
            }
            
            // Display as "MASTER OF [DEGREE TYPE] in [DEPARTMENT]" format for PG students
            courseInfo = `${degreeType} in ${department}`;
            coreTwoInfo = ''; // PG doesn't have minor subjects
          } else {
            // UG format: Find major and minor courses
            const majorCourse = firstMarksheet.courses.find(course => 
              course.courseType && course.courseType.toLowerCase().startsWith('major')
            );
            const minorCourse = firstMarksheet.courses.find(course => 
              course.courseType && course.courseType.toLowerCase().startsWith('minor')
            );

            if (majorCourse?.subjectName) {
              courseInfo = `CORE-1: ${majorCourse.subjectName.toUpperCase()}`;
            } else if (firstMarksheet.courses[0]) {
              const firstCourse = firstMarksheet.courses[0];
              courseInfo = `${firstCourse.courseType?.toUpperCase() || ''}: ${firstCourse.subjectName?.toUpperCase() || ''}`.trim();
            }

            if (minorCourse?.subjectName) {
              coreTwoInfo = `CORE-2: ${minorCourse.subjectName.toUpperCase()}`;
            } else {
              coreTwoInfo = '';
            }
          }
        }
        
        // Update the data with API values
        setData(prevData => {
          const newData = {
            ...prevData,
            studentInfo: {
              ...prevData.studentInfo,
              name: apiStudentInfo.name || prevData.studentInfo.name,
              examRollNo: apiStudentInfo.rollNo || prevData.studentInfo.examRollNo, // BA24-003 (College Roll No in display)
              registrationNo: apiStudentInfo.autonomousRollNo || prevData.studentInfo.registrationNo, // 03NAC24001 (Exam Roll No in display)
              mediumOfExam: language,
              course: courseInfo,
              coreTwo: coreTwoInfo,
              department: apiStudentInfo.department || prevData.studentInfo.department
            }
          };
          return newData;
        });
      } else {
        console.warn('⚠️ GradeSheet - No marksheets found or missing student info:', {
          hasStudentInfo: !!apiStudentInfo,
          marksheetsCount: marksheets?.length || 0,
          studentInfo: apiStudentInfo
        });
      }
    } catch (err) {
      console.error('❌ Error fetching student data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        autonomousRollNo: user?.autonomousRollNo || user?.['Autonomous Roll No']
      });
      // Optionally show error to user
      alert(`Failed to load marksheet data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZATION: Memoize PDF generation function
  const generatePDF = useCallback(() => {
    if (gradeSheetRef.current) {
      setDownloading(true);
      
      // Store original styles
      const originalWidth = gradeSheetRef.current.style.width;
      const originalMaxWidth = gradeSheetRef.current.style.maxWidth;
      const originalPadding = gradeSheetRef.current.style.padding;
      const originalMargin = gradeSheetRef.current.style.margin;
      
      // Force compact dimensions for single-page PDF
      gradeSheetRef.current.style.width = '700px';
      gradeSheetRef.current.style.maxWidth = '700px';
      gradeSheetRef.current.style.padding = '15px';
      gradeSheetRef.current.style.margin = '0';

      // Add compact PDF class
      gradeSheetRef.current.classList.add('pdf-compact');

      html2canvas(gradeSheetRef.current, { 
        scale: 2,
        width: 700,
        height: undefined,
        useCORS: true,
        allowTaint: true
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        
        // Calculate dimensions for single page
        const imgWidth = 190; // A4 width in mm (with margins)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if content fits on one page
        const maxHeight = 270; // A4 height in mm (with margins)
        
        if (imgHeight <= maxHeight) {
          // Single page - center the content
          const yOffset = (297 - imgHeight) / 2; // Center vertically
          pdf.addImage(imgData, "PNG", 10, yOffset, imgWidth, imgHeight);
        } else {
          // If still too large, scale down to fit on one page
          const scaleFactor = maxHeight / imgHeight;
          const scaledWidth = imgWidth * scaleFactor;
          const scaledHeight = maxHeight;
          const xOffset = (210 - scaledWidth) / 2; // Center horizontally
          const yOffset = (297 - scaledHeight) / 2; // Center vertically
          
          pdf.addImage(imgData, "PNG", xOffset, yOffset, scaledWidth, scaledHeight);
        }
        
        // Use "mark_sheet" for PG students, "grade_sheet" for UG students
        // OPTIMIZATION: Use memoized isPGStudent from component level
        const filePrefix = isPGStudent ? 'mark_sheet' : 'grade_sheet';
        const filename = `${filePrefix}_${data.studentInfo.name || 'student'}_${marksheetData?.publicationDate || 'result'}.pdf`.replace(/\s+/g, '_');
        pdf.save(filename);
        
        // Restore original styles
        gradeSheetRef.current.style.width = originalWidth;
        gradeSheetRef.current.style.maxWidth = originalMaxWidth;
        gradeSheetRef.current.style.padding = originalPadding;
        gradeSheetRef.current.style.margin = originalMargin;
        
        // Remove compact PDF class
        gradeSheetRef.current.classList.remove('pdf-compact');
        
        setDownloading(false);
      }).catch((error) => {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
        setDownloading(false);
      });
    }
  }, [marksheetData, data, isPGStudent]);

  if (loading) {
    return (
      <div className="grade-sheet-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading grade sheet...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="grade-sheet-container">
      <div className="grade-sheet-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>{marksheetData?.isPGStudent ? 'Mark-sheet' : 'Grade Sheet'}</h1>
        <button 
          onClick={generatePDF} 
          className="download-pdf-btn"
          disabled={downloading || loading}
        >
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <div className="grade-sheet-document" ref={gradeSheetRef}>
        {/* Document Title */}
        <div className="document-header">
          <img src="/college.png" alt="College Logo" className="college-logo" />
          <div className="document-header-text">
            <h1 className="exam-title">{data.examTitle}</h1>
            <h2 className="document-type">{marksheetData?.isPGStudent ? 'MARK SHEET CUM GRADE SHEET' : (data.documentType || 'Grade Sheet')}</h2>
            <p className="document-subtitle">first-semester(admission-batch2024)</p>
          </div>
        </div>

        {/* Student Information Block */}
        <div className="student-info-block">
          <div className="info-left-column">
            <div className="info-row">
              <span className="label">Name</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.name}</span>
            </div>
            <div className="info-row">
              <span className="label">Course</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.course}</span>
            </div>
            <div className="info-row">
              <span className="label"></span>
              <span className="colon"></span>
              <span className="value">{data.studentInfo.coreTwo}</span>
            </div>
            <div className="info-row">
              <span className="label">College</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.college}</span>
            </div>
          </div>
          
          <div className="info-right-column">
            <div className="info-row">
              <span className="label">Exam Roll No.</span>
              <span className="colon">:</span>
              <span className="value">{studentInfo?.autonomousRollNo || data.studentInfo.registrationNo}</span>
            </div>
            <div className="info-row">
              <span className="label">College Roll No.</span>
              <span className="colon">:</span>
              <span className="value">{studentInfo?.rollNo || data.studentInfo.examRollNo}</span>
            </div>
            <div className="info-row">
              <span className="label">Medium of Exam</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.mediumOfExam}</span>
            </div>
          </div>
        </div>

        {/* Grade Details Table */}
        <div className="grade-table-container">
          {(() => {
            // OPTIMIZATION: Use memoized isPGStudent from component level

            if (isPGStudent && marksheetData && Array.isArray(marksheetData.courses) && marksheetData.courses.length > 0) {
              // PG Format: MID SEM | END SEM | TOTAL structure
              const courses = marksheetData.courses.filter(course => course != null);
              
              // Check department type
              const department = (marksheetData.department || studentInfo?.department || '').toUpperCase();
              const isChemistry = department === 'CHEMISTRY' || department === 'CHEM';
              const isGeology = department === 'GEOLOGY' || department === 'GEOL';
              
              // Calculate totals based on department format
              let totalMidSemFM = 0;
              let totalMidSemMS = 0;
              let totalEndSemFM = 0;
              let totalEndSemMS = 0;
              let totalFM = 0;
              let totalMS = 0;

              courses.forEach(course => {
                const isPractical = course.midsem === 0 && course.endsem === 0 && (course.marks > 0 || course.practical > 0);
                
                if (isChemistry) {
                  if (isPractical) {
                    // Chemistry Practical: No mid sem, End sem FM = 50, Total FM = 50
                    totalEndSemFM += 50;
                    totalEndSemMS += (course.endsem || course.practical || course.marks || 0);
                    totalFM += 50;
                    totalMS += (course.marks || 0);
                  } else {
                    // Chemistry Theory: Mid sem FM = 20, End sem FM = 50, Total FM = 70
                    totalMidSemFM += 20;
                    totalMidSemMS += (course.midsem || 0);
                    totalEndSemFM += 50;
                    totalEndSemMS += (course.endsem || 0);
                    totalFM += 70;
                    totalMS += (course.marks || 0);
                  }
                } else if (isGeology) {
                  // Geology: All courses (theory and practical) use MID SEM FM = 30, END SEM FM = 70, TOTAL FM = 100
                  // For practicals, use midsempractical and endsempractical fields for totals calculation
                  totalMidSemFM += 30;
                  // For practical courses, add midsempractical to total MID SEM marks
                  if (isPractical && course.midsempractical != null) {
                    totalMidSemMS += course.midsempractical;
                  } else {
                    totalMidSemMS += (course.midsem || 0);
                  }
                  totalEndSemFM += 70;
                  // For practical courses, add endsempractical to total END SEM marks
                  if (isPractical && course.endsempractical != null) {
                    totalEndSemMS += course.endsempractical;
                  } else {
                    totalEndSemMS += (course.endsem || 0);
                  }
                  totalFM += 100;
                  // TOTAL marks always uses the marks field, not midsempractical + endsempractical
                  totalMS += (course.marks || 0);
                } else {
                  // Default format (other PG departments): Mid sem FM = 30, End sem FM = 70, Total FM = 100
                  totalMidSemFM += 30;
                  totalMidSemMS += (course.midsem || 0);
                  totalEndSemFM += 70;
                  totalEndSemMS += (course.endsem || 0);
                  totalFM += 100;
                  totalMS += (course.marks || 0);
                }
              });

              return (
                <table className="grade-table pg-marksheet-table">
                  <thead>
                    <tr>
                      <th rowSpan="2">SUBJECTS</th>
                      <th colSpan="2">MID SEM</th>
                      <th colSpan="2">END SEM</th>
                      <th colSpan="2">TOTAL</th>
                      <th rowSpan="2">CREDIT</th>
                      <th rowSpan="2">GRADE</th>
                      <th rowSpan="2">GP</th>
                      <th rowSpan="2">CP</th>
                    </tr>
                    <tr>
                      <th>FM</th>
                      <th>MS</th>
                      <th>FM</th>
                      <th>MS</th>
                      <th>FM</th>
                      <th>MS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, index) => {
                      const courseType = course.courseType || '';
                      const displayCourseType = courseType.toUpperCase();
                      const subjectName = course.subjectName || '';
                      
                      // Check if practical course
                      const isPractical = course.midsem === 0 && course.endsem === 0 && (course.marks > 0 || course.practical > 0);
                      
                      let midSemFM, midSemMS, endSemFM, endSemMS, totalFM, totalMS;
                      
                      if (isChemistry) {
                        if (isPractical) {
                          // Chemistry Practical: No mid sem, End sem FM = 50, Total FM = 50
                          midSemFM = '';
                          midSemMS = '';
                          endSemFM = 50;
                          endSemMS = course.endsem || course.practical || course.marks || 0;
                          totalFM = 50;
                          totalMS = course.marks || 0;
                        } else {
                          // Chemistry Theory: Mid sem FM = 20, End sem FM = 50, Total FM = 70
                          midSemFM = 20;
                          midSemMS = course.midsem || 0;
                          endSemFM = 50;
                          endSemMS = course.endsem || 0;
                          totalFM = 70;
                          totalMS = course.marks || 0;
                        }
                      } else if (isGeology) {
                        // Geology: All courses (theory and practical) use MID SEM FM = 30, END SEM FM = 70, TOTAL FM = 100
                        midSemFM = 30;
                        endSemFM = 70;
                        totalFM = 100;
                        
                        // For practical courses, display midsempractical and endsempractical in MS columns
                        if (isPractical) {
                          // MID SEM MS: Display midsempractical (e.g., 28)
                          midSemMS = course.midsempractical != null ? course.midsempractical : 0;
                          // END SEM MS: Display endsempractical (e.g., 68)
                          endSemMS = course.endsempractical != null ? course.endsempractical : 0;
                          // TOTAL MS: Display marks field (e.g., 96)
                          totalMS = course.marks || 0;
                        } else {
                          // Theory courses use regular midsem and endsem fields
                          midSemMS = course.midsem || 0;
                          endSemMS = course.endsem || 0;
                          totalMS = course.marks || 0;
                        }
                      } else {
                        // Default format (other PG departments): Mid sem FM = 30, End sem FM = 70, Total FM = 100
                        midSemFM = 30;
                        midSemMS = course.midsem || 0;
                        endSemFM = 70;
                        endSemMS = course.endsem || 0;
                        totalFM = 100;
                        totalMS = course.marks || 0;
                      }

                      return (
                        <tr key={index}>
                          <td className="subject-name-cell">{displayCourseType} {subjectName}</td>
                          <td>{midSemFM}</td>
                          <td>{midSemMS}</td>
                          <td>{endSemFM}</td>
                          <td>{endSemMS}</td>
                          <td>{totalFM}</td>
                          <td>{totalMS}</td>
                          <td>{course.credit || 0}</td>
                          <td>{course.grade || ''}</td>
                          <td>{course.gradePoint || ''}</td>
                          <td>{course.creditPoint || ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td className="total-label">TOTAL</td>
                      <td>{totalMidSemFM || ''}</td>
                      <td>{totalMidSemMS}</td>
                      <td>{totalEndSemFM}</td>
                      <td>{totalEndSemMS}</td>
                      <td>{totalFM}</td>
                      <td>{totalMS}</td>
                      <td>{marksheetData.totalCredits || 0}</td>
                      <td></td>
                      <td></td>
                      <td>{marksheetData.totalCreditPoints || 0}</td>
                    </tr>
                  </tbody>
                </table>
              );
            } else {
              // UG Format: Original structure
              return (
                <table className="grade-table">
                  <thead>
                    <tr>
                      <th>SUBJECT CODE</th>
                      <th>COURSE</th>
                      <th>COURSE TITLE</th>
                      <th>CREDIT</th>
                      <th>GRADE</th>
                      <th>GRADE POINT</th>
                      <th>CREDIT POINT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksheetData && Array.isArray(marksheetData.courses) && marksheetData.courses.length > 0 ? (
                      <>
                        {(() => {
                          let majorCount = 0;
                          return marksheetData.courses
                            .filter(course => course != null)
                            .map((course, index) => {
                              const courseType = course.courseType || '';
                              const normalizedType = courseType.toLowerCase();
                              let displayCourseType = courseType.toUpperCase();

                              if (normalizedType.startsWith('major')) {
                                majorCount += 1;
                                displayCourseType = `CORE-1 MAJOR-${majorCount}`;
                              } else if (normalizedType.startsWith('minor')) {
                                displayCourseType = 'CORE-2 Minor-1';
                              } else if (normalizedType.includes('aec')) {
                                displayCourseType = 'AEC-1';
                              } else if (normalizedType.includes('vac')) {
                                displayCourseType = 'VAC-1';
                              }

                              return (
                                <tr key={index}>
                                  <td>{displayCourseType}</td>
                                  <td>{course.subjectName || ''}</td>
                                  <td>{course.subjectName || ''}</td>
                                  <td>{course.credit || 0}</td>
                                  <td>{course.grade || ''}</td>
                                  <td>{course.gradePoint || ''}</td>
                                  <td>{course.creditPoint || ''}</td>
                                </tr>
                              );
                            });
                        })()}
                        <tr className="total-row">
                          <td colSpan="3" className="total-label">TOTAL</td>
                          <td>{marksheetData.totalCredits || 0}</td>
                          <td></td>
                          <td></td>
                          <td>{marksheetData.totalCreditPoints || 0}</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {data.gradeDetails.map((subject, index) => (
                          <tr key={index}>
                            <td>{subject.subjectCode}</td>
                            <td>{subject.course}</td>
                            <td>{subject.courseTitle}</td>
                            <td>{subject.credit}</td>
                            <td>{subject.grade}</td>
                            <td>{subject.gradePoint}</td>
                            <td>{subject.creditPoint}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan="3" className="total-label">TOTAL</td>
                          <td>{data.totals.totalCredits}</td>
                          <td></td>
                          <td></td>
                          <td>{data.totals.totalCreditPoints}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              );
            }
          })()}
        </div>

        {/* Result and SGPA/Marks Section */}
        <div className="result-sgpa-section">
          {(() => {
            const isPGStudent = marksheetData?.isPGStudent || marksheetData?.courses?.some(course => 
              course && course.courseType && (
                course.courseType.toUpperCase().startsWith('PAPER') ||
                /^[A-Z]{2,4}\d{3,4}$/i.test(course.courseType)
              )
            );

            if (isPGStudent) {
              // PG format: Show Result, Grade, Credit Index, and SGPA
              // Calculate Grade from SGPA
              const sgpa = marksheetData?.sgpa || 0;
              let grade = '';
              if (sgpa >= 9.0) grade = 'O';
              else if (sgpa >= 8.0) grade = 'A+';
              else if (sgpa >= 7.0) grade = 'A';
              else if (sgpa >= 6.0) grade = 'B+';
              else if (sgpa >= 5.0) grade = 'B';
              else if (sgpa >= 4.0) grade = 'C';
              else if (sgpa >= 3.6) grade = 'D';
              else grade = 'F';

              return (
                <div className="pg-results-section">
                  <div className="pg-result-item">
                    <span className="label">Result</span>
                    <span className="colon">:</span>
                    <span className="value">{marksheetData?.classification || 'PASS'}</span>
                  </div>
                  <div className="pg-result-item">
                    <span className="label">Grade</span>
                    <span className="colon">:</span>
                    <span className="value">{grade}</span>
                  </div>
                  <div className="pg-result-item">
                    <span className="label">Credit Index</span>
                    <span className="colon">:</span>
                    <span className="value">{marksheetData?.totalCreditPoints || 0}</span>
                  </div>
                  <div className="pg-result-item">
                    <span className="label">SGPA</span>
                    <span className="colon">:</span>
                    <span className="value">{sgpa.toFixed(2)}</span>
                  </div>
                </div>
              );
            } else {
              // UG format: Show Result and SGPA
              return (
                <>
                  <div className="result-left">
                    <span className="label">Result</span>
                    <span className="colon">:</span>
                    <span className="value result-value">{marksheetData ? marksheetData.classification : data.result}</span>
                  </div>
                  <div className="sgpa-right">
                    <span className="label">SGPA</span>
                    <span className="colon">:</span>
                    <span className="value sgpa-value">{marksheetData ? marksheetData.sgpa : data.sgpa}</span>
                  </div>
                </>
              );
            }
          })()}
        </div>

        {/* Grading System Table */}
        <div className="grading-system-container">
          <table className="grading-system-table">
            <thead>
              <tr>
                <th colSpan="3" className="grading-system-title">GRADING SYSTEM</th>
              </tr>
              <tr>
                <th>Grade</th>
                <th>Marks Secured from 100</th>
                <th>Grade Points</th>
              </tr>
            </thead>
            <tbody>
              {data.gradingSystem.map((grade, index) => (
                <tr key={index}>
                  <td>{grade.grade}</td>
                  <td>{grade.marksRange}</td>
                  <td>{grade.gradePoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="grade-sheet-footer">
          <div className="controller-signature">
            <img src="/EXAMINER.jpg" alt="Controller of Examinations Signature" className="signature-image" />
            <div className="signature-label">CONTROLLER OF EXAMINATIONS</div>
          </div>
          <div className="principal-signature">
            <img src="/PRINCIPAL.jpg" alt="principal" className="signature-image" />
            <div className="signature-label">principal</div>
          </div>
        </div>

        <div className="disclaimer">
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}

