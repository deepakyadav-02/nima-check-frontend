import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import './Marksheet.css';
import config from '../config';

export default function Marksheet({ user }) {
  const [marksheets, setMarksheets] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  const marksheetRef = useRef();

  useEffect(() => {
    fetchMarksheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchMarksheets = async () => {
    try {
      setLoading(true);
      const autonomousRollNo = user?.autonomousRollNo || user?.['Autonomous Roll No'];
      
      console.log('🔍 User object:', user);
      console.log('🔍 Autonomous Roll No:', autonomousRollNo);
      
      if (!autonomousRollNo) {
        setError('Roll number not found');
        return;
      }
      const url = `${config.API_URL}/api/marksheet/autonomous/${autonomousRollNo}`;
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
          studentData = {
            name: populatedStudent['Name of the Students'] || populatedStudent.name,
            autonomousRollNo: populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
            rollNo: populatedStudent['Roll No'] || populatedStudent.rollNo,
            department: populatedStudent.Department || populatedStudent.department
          };
        }
      } else if (data.marksheets) {
        console.log('📌 Response has marksheets property');
        marksheetsArray = data.marksheets;
        studentData = data.student;
        // Also extract from populated field if available
        if (!studentData && marksheetsArray.length > 0 && marksheetsArray[0].student) {
          const populatedStudent = marksheetsArray[0].student;
          studentData = {
            name: populatedStudent['Name of the Students'] || populatedStudent.name,
            autonomousRollNo: populatedStudent['Autonomous Roll No'] || populatedStudent.autonomousRollNo,
            rollNo: populatedStudent['Roll No'] || populatedStudent.rollNo,
            department: populatedStudent.Department || populatedStudent.department
          };
        }
      }
      
      console.log('🔍 Marksheets found:', marksheetsArray.length);
      console.log('🔍 Student info:', studentData);
      console.log('🔍 First marksheet:', marksheetsArray[0]);
      
      setMarksheets(marksheetsArray);
      setStudentInfo(studentData);
      if (marksheetsArray.length > 0) {
        setSelectedSemester(marksheetsArray[0]);
      }
    } catch (err) {
      console.error('❌ Error fetching marksheets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadMarksheet = async () => {
    setDownloading(true);
    try {
      const element = marksheetRef.current;
      
      // Temporarily hide the download button
      const downloadBtn = element.querySelector('.btn-download');
      const originalDisplay = downloadBtn ? downloadBtn.style.display : '';
      if (downloadBtn) downloadBtn.style.display = 'none';

      // Capture the marksheet as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore button visibility
      if (downloadBtn) downloadBtn.style.display = originalDisplay;

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const studentName = selectedSemester.student['Name of the Students'] || 'Student';
      const semester = selectedSemester.semester;
      const filename = `Marksheet_${studentName.replace(/\s+/g, '_')}_Sem${semester}.pdf`;

      // Download PDF
      pdf.save(filename);
      
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download marksheet. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="marksheet-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading marksheets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marksheet-container">
        <div className="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Error Loading Marksheets</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (marksheets.length === 0) {
    return (
      <div className="marksheet-container">
        <div className="no-results">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <h3>No Marksheets Available</h3>
          <p>Your examination results will appear here once they are published.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="marksheet-container">
      <div className="marksheet-header-section">
        <button onClick={() => navigate('/dashboard')} className="btn-back-small">
          ← Back
        </button>
        <h1>Examination Results</h1>
        <p className="subtitle">View and download your semester marksheets</p>
      </div>

      <div className="semester-selector">
        <h3>Select Semester:</h3>
        <div className="semester-tabs">
          {marksheets.map((marksheet) => (
            <button
              key={marksheet._id}
              className={`semester-tab ${selectedSemester?._id === marksheet._id ? 'active' : ''}`}
              onClick={() => setSelectedSemester(marksheet)}
            >
              Semester {marksheet.semester}
            </button>
          ))}
        </div>
      </div>

      {selectedSemester && (
        <div className="marksheet-content">
          <div className="preview-actions-top">
            <button 
              onClick={downloadMarksheet} 
              className="download-btn"
              disabled={downloading}
            >
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>
          
          <div className="marksheet-card" ref={marksheetRef}>
            {/* College Header - Similar to Admit Card */}
            <div className="marksheet-header">
              <div className="logo-section">
                <img src="/college.png" alt="College Logo" className="college-logo"/>
              </div>
              <div className="college-info">
                <h1>NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA</h1>
                <h2>EXAMINATION MARKSHEET</h2>
                <h3>SEMESTER - {selectedSemester.semester} (BATCH - 2024)</h3>
                <p className="college-address">At/Po: Nimapara, Dist: Puri, Odisha - 752106</p>
              </div>
            </div>

            {/* Student Details Section */}
            <div className="student-info-section">
              <div className="detail-row">
                <span className="label">NAME OF THE STUDENT</span>
                <span className="colon">:</span>
                <span className="value">{studentInfo?.name || selectedSemester.student?.['Name of the Students'] || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">COLLEGE ROLL NUMBER</span>
                <span className="colon">:</span>
                <span className="value">{studentInfo?.autonomousRollNo || selectedSemester.student?.['Autonomous Roll No'] || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">EXAM ROLL NUMBER</span>
                <span className="colon">:</span>
                <span className="value">{studentInfo?.rollNo || selectedSemester.student?.['Roll No'] || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">DEPARTMENT</span>
                <span className="colon">:</span>
                <span className="value">{studentInfo?.department || selectedSemester.student?.Department || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">ACADEMIC YEAR</span>
                <span className="colon">:</span>
                <span className="value">2024-2025</span>
              </div>
            </div>

            <div className="marks-table-container">
              <table className="marks-table">
                <thead>
                  <tr>
                    <th rowSpan="2">S.No</th>
                    <th rowSpan="2">Subject Name</th>
                    <th rowSpan="2">Course Type</th>
                    <th rowSpan="2">Credit</th>
                    <th colSpan="3">Marks Obtained</th>
                    <th rowSpan="2">Total</th>
                    <th rowSpan="2">Grade</th>
                    <th rowSpan="2">GP</th>
                    <th rowSpan="2">CP</th>
                  </tr>
                  <tr>
                    <th>Theory</th>
                    <th>Internal</th>
                    <th>Practical</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSemester.courses.map((course, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td className="subject-name">{course.subjectName}</td>
                      <td>{course.courseType}</td>
                      <td>{course.credit}</td>
                      <td>{course.theory || '-'}</td>
                      <td>{course.internal || '-'}</td>
                      <td>{course.practical || '-'}</td>
                      <td><strong>{course.marks}</strong></td>
                      <td className="grade-cell">
                        <strong>{course.grade}</strong>
                      </td>
                      <td>{course.gradePoint}</td>
                      <td>{course.creditPoint.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="summary-section">
              <h3>Semester Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon">📚</div>
                  <div className="summary-content">
                    <div className="summary-label">Total Credits</div>
                    <div className="summary-value">{selectedSemester.totalCredits}</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">⭐</div>
                  <div className="summary-content">
                    <div className="summary-label">Total Credit Points</div>
                    <div className="summary-value">{selectedSemester.totalCreditPoints.toFixed(2)}</div>
                  </div>
                </div>
                <div className="summary-card highlight">
                  <div className="summary-icon">🎯</div>
                  <div className="summary-content">
                    <div className="summary-label">SGPA</div>
                    <div className="summary-value">{selectedSemester.sgpa.toFixed(2)}</div>
                  </div>
                </div>
                <div className="summary-card highlight">
                  <div className="summary-icon">📊</div>
                  <div className="summary-content">
                    <div className="summary-label">Percentage</div>
                    <div className="summary-value">{selectedSemester.percentage.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              <div className="classification-banner">
                <div className="classification-label">Classification</div>
                <div className="classification-value">{selectedSemester.classification}</div>
              </div>
            </div>

            <div className="grade-legend">
              <h4>Grade Point System:</h4>
              <div className="legend-items">
                <span className="legend-item"><strong>O (10)</strong>: 90-100</span>
                <span className="legend-item"><strong>A+ (9)</strong>: 80-89</span>
                <span className="legend-item"><strong>A (8)</strong>: 70-79</span>
                <span className="legend-item"><strong>B+ (7)</strong>: 60-69</span>
                <span className="legend-item"><strong>B (6)</strong>: 50-59</span>
                <span className="legend-item"><strong>C (5)</strong>: 40-49</span>
                <span className="legend-item"><strong>P (4)</strong>: 35-39</span>
                <span className="legend-item"><strong>F (0)</strong>: Below 35</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

