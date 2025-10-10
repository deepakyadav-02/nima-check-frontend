import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import gradeSheetData from '../data/gradeSheetData.json';
import { fetchMarksheetsByRollNo } from '../services/marksheetService';
import './GradeSheet.css';

export default function GradeSheet({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(gradeSheetData);
  const [studentInfo, setStudentInfo] = useState(null);
  const [marksheetData, setMarksheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const gradeSheetRef = useRef(null);

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
      
      console.log('📥 GradeSheet received apiStudentInfo:', apiStudentInfo);
      console.log('📥 GradeSheet ABC_ID from API:', apiStudentInfo?.abcId);
      
      if (apiStudentInfo && marksheets && marksheets.length > 0) {
        setStudentInfo(apiStudentInfo);
        const firstMarksheet = marksheets[0];
        
        // Store the marksheet data (courses, totals, sgpa)
        // Format createdAt date to DD/MM/YYYY
        let publicationDate = data.publicationDate; // fallback to default
        if (firstMarksheet.createdAt) {
          const date = new Date(firstMarksheet.createdAt);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          publicationDate = `${day}/${month}/${year}`;
        }
        
        setMarksheetData({
          courses: firstMarksheet.courses || [],
          totalCredits: firstMarksheet.totalCredits || 0,
          totalCreditPoints: firstMarksheet.totalCreditPoints || 0,
          sgpa: firstMarksheet.sgpa || 0,
          publicationDate: publicationDate,
          classification: firstMarksheet.classification || 'N/A'
        });
        
        // Determine language based on first two courses
        let language = 'ENGLISH';
        if (firstMarksheet.courses && firstMarksheet.courses.length > 0) {
          // Check first two courses for ODIA
          const firstTwoCourses = firstMarksheet.courses.slice(0, 2);
          const hasOdiaCourse = firstTwoCourses.some(course => 
            course.subjectName && course.subjectName.toLowerCase().includes('odia')
          );
          if (hasOdiaCourse) {
            language = 'ODIA';
          }
        }
        
        // Determine course info (MAJOR CP-1: SUBJECT, CORE-II: SUBJECT)
        let courseInfo = data.studentInfo.course;
        let coreTwoInfo = data.studentInfo.coreTwo;
        
        if (firstMarksheet.courses && firstMarksheet.courses.length > 0) {
          // First course
          if (firstMarksheet.courses[0]) {
            const firstCourse = firstMarksheet.courses[0];
            courseInfo = `${firstCourse.courseType.toUpperCase()}: ${firstCourse.subjectName.toUpperCase()}`;
          }
          // Second course if exists
          if (firstMarksheet.courses[1]) {
            const secondCourse = firstMarksheet.courses[1];
            coreTwoInfo = `${secondCourse.courseType.toUpperCase()}: ${secondCourse.subjectName.toUpperCase()}`;
          } else {
            coreTwoInfo = ''; // Leave blank if not present
          }
        }
        
        // Update the data with API values
        const abcIdToSet = apiStudentInfo.abcId || '';
        console.log('📝 Setting ABC_ID in state:', abcIdToSet);
        
        setData(prevData => {
          const newData = {
            ...prevData,
            studentInfo: {
              ...prevData.studentInfo,
              name: apiStudentInfo.name || prevData.studentInfo.name,
              examRollNo: apiStudentInfo.rollNo || prevData.studentInfo.examRollNo, // BA24-003 (College Roll No in display)
              registrationNo: apiStudentInfo.autonomousRollNo || prevData.studentInfo.registrationNo, // 03NAC24001 (Exam Roll No in display)
              abcId: abcIdToSet, // Leave blank if not present
              mediumOfExam: language,
              course: courseInfo,
              coreTwo: coreTwoInfo
            }
          };
          console.log('📝 New data state:', newData);
          console.log('📝 ABC_ID in new state:', newData.studentInfo.abcId);
          return newData;
        });
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
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
        
        const filename = `grade_sheet_${data.studentInfo.name || 'student'}_${marksheetData?.publicationDate || 'result'}.pdf`.replace(/\s+/g, '_');
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
  };

  console.log('🎨 Rendering GradeSheet with data:', data);
  console.log('🎨 Displaying ABC_ID:', data.studentInfo.abcId);

  return (
    <div className="grade-sheet-container">
      <div className="grade-sheet-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>Grade Sheet</h1>
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
          <h1 className="exam-title">{data.examTitle}</h1>
          <h2 className="document-type">{data.documentType}</h2>        </div>

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
              <span className="label">ABC ID</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.abcId}</span>
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
              <span className="value">{data.studentInfo.registrationNo}</span>
            </div>
            <div className="info-row">
              <span className="label">College Roll No.</span>
              <span className="colon">:</span>
              <span className="value">{data.studentInfo.examRollNo}</span>
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
              {marksheetData ? (
                // Use API data if available
                <>
                  {marksheetData.courses.map((course, index) => (
                    <tr key={index}>
                      <td>{course.courseType}</td>
                      <td>{course.subjectName}</td>
                      <td>{course.subjectName}</td>
                      <td>{course.credit}</td>
                      <td>{course.grade}</td>
                      <td>{course.gradePoint}</td>
                      <td>{course.creditPoint}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan="3" className="total-label">TOTAL</td>
                    <td>{marksheetData.totalCredits}</td>
                    <td></td>
                    <td></td>
                    <td>{marksheetData.totalCreditPoints}</td>
                  </tr>
                </>
              ) : (
                // Fallback to JSON data
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
        </div>

        {/* Result and SGPA Section */}
        <div className="result-sgpa-section">
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
        </div>

        <div className="sgpa-explanation">
          {data.sgpaExplanation}
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
          <div className="publication-date">
            Date of Publication {marksheetData ? marksheetData.publicationDate : data.publicationDate}
          </div>
          <div className="controller-of-examinations">
            {data.controllerOfExaminations}
          </div>
        </div>

        <div className="disclaimer">
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}

