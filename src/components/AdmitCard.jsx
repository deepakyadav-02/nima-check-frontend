import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './AdmitCard.css';

const AdmitCard = ({ user }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true); // Changed to true to show preview by default
  const admitCardRef = useRef(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIT_CARD}?autonomousRollNo=${user.autonomousRollNo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Admit card API response:', response.data);

      // Backend returns student data directly, not wrapped in success/student fields
      if (response.data && response.data.autonomousRollNo) {
        setStudentData(response.data);
      } else {
        setError('Failed to fetch student data');
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to fetch student data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (admitCardRef.current) {
      html2canvas(admitCardRef.current, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`admit_card_${studentData.autonomousRollNo}.pdf`);
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Convert DD-MM-YYYY to YYYY-MM-DD for date input
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateString;
  };

  const getStudentType = () => {
    if (studentData?.autonomousRollNo?.includes('BBA')) return 'BBA';
    if (studentData?.autonomousRollNo?.includes('NAC24')) return 'UG';
    if (studentData?.autonomousRollNo?.includes('111NAC')) return 'PG';
    return 'STUDENT';
  };

  const getSubjects = () => {
    if (!studentData) return {};
    
    // Extract subjects based on student type
    const subjects = {};
    
    if (studentData.Department === 'BBA') {
      subjects['Major CP-1'] = studentData['CC-201'] || '';
      subjects['Major CP-2'] = studentData['CC-202'] || '';
      subjects['Minor P-1'] = studentData['CC-203'] || '';
      subjects['MDC-1'] = studentData['Multi Disciplinary-201'] || '';
      subjects['AEC'] = studentData['AEC-201'] || '';
      subjects['VAC-1'] = studentData['VAC-201-I.C'] || '';
    } else if (studentData.Department && studentData.Department !== 'BBA') {
      subjects['Major CP-1'] = studentData['Major-3'] || '';
      subjects['Major CP-2'] = studentData['Major-4'] || '';
      subjects['Minor P-1'] = studentData['MINOR-2'] || '';
      subjects['MDC-1'] = studentData['Multi Disciplinary-2'] || '';
      subjects['AEC'] = studentData['AEC-2'] || '';
      subjects['VAC-1'] = studentData['SEC-I'] || '';
    }
    
    return subjects;
  };

  const getMajorSubject = () => {
    if (studentData?.Department === 'BBA') {
      return studentData['CC-201'] || '';
    } else if (studentData?.Department && studentData.Department !== 'BBA') {
      return studentData['Major-3'] || studentData.Course || '';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your admit card...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchStudentData} className="retry-btn">Try Again</button>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="no-data-container">
        <h3>No Data Found</h3>
        <p>Unable to retrieve student information.</p>
      </div>
    );
  }

  const subjects = getSubjects();
  const studentType = getStudentType();
  const majorSubject = getMajorSubject();

  return (
    <div className="admit-card-container">
      {!showPreview ? (
        <div className="preview-controls">
          <h2>Your Admit Card</h2>
          <p>Welcome, {studentData.name || studentData['Name of the Students'] || studentData['Applicant Name']}</p>
          <p>Roll No: {studentData.autonomousRollNo}</p>
          <button
            onClick={() => setShowPreview(true)}
            className="preview-btn"
          >
            View Admit Card
          </button>
        </div>
      ) : (
        <div className="preview-container">
          <div className="admit-card" ref={admitCardRef}>
            <div className="card-header">
              <div className="logo-box">
                <img src="/college.png" alt="College Logo" className="college-logo"/>
              </div>
              <div className="header-text">
                <h2>NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA</h2>
                <h3>ADMIT CARD (BATCH -2024)</h3>
                                <h3>EXAMINATION-2025</h3>

              </div>
            </div>

            <div className="details-and-subjects">
              <div className="student-details">
                <div className="details-left">
                  <div className="detail-row">
                    <span className="label">STREAM</span>
                    <span className="colon">:</span>
                    <span className="value">{studentType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">EXAM ROLL NUMBER</span>
                    <span className="colon">:</span>
                    <span className="value">{studentData.autonomousRollNo}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">COLLEGE NUMBER</span>
                    <span className="colon">:</span>
                    <span className="value">{studentData.rollNo || studentData['College Roll No'] || studentData['Roll No']}</span>
                    <span className="core-subject">
                      MAJOR - {majorSubject}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">NAME OF THE STUDENT</span>
                    <span className="colon">:</span>
                    <span className="value">
                      {studentData.name || studentData['Name of the Students'] || studentData['Applicant Name']}
                    </span>
                  </div>
                </div>

                <div className="details-right">
                  <div className="photo-container">
                    <div className="photo-box">
                      <div className="photo-placeholder">
                        <span>PHOTO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="subjects-table">
                <table>
                  <thead>
                    <tr>
                      <th>Major CP-1</th>
                      <th>Major CP-2</th>
                      <th>Minor P-1</th>
                      <th>MDC-1</th>
                      <th>AEC</th>
                      <th>VAC-1</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{subjects['Major CP-1']}</td>
                      <td>{subjects['Major CP-2']}</td>
                      <td>{subjects['Minor P-1']}</td>
                      <td>{subjects['MDC-1']}</td>
                      <td>{subjects['AEC']}</td>
                      <td>{subjects['VAC-1']}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="undertaking">
              <p>I undertake to abide by the rules printed below.</p>
            </div>

            <div className="signatures">
              <div className="signature-section">
                <div className="principal-sign">
                  <div className="signature-placeholder">
                    <span>PRINCIPAL</span>
                  </div>
                  <p>PRINCIPAL/CENTRE SUPERINTENDENT</p>
                </div>
                
                <div className="controller-sign">
                  <div className="student-sign">
                    <div className="signature-box"></div>
                    <p>Signature of the Student in Full</p>
                  </div>
                  <div className="signature-placeholder">
                    <span>CONTROLLER</span>
                  </div>
                  <p>CONTROLLER OF EXAMINATIONS</p>
                </div>
              </div>
            </div>

            <div className="rules-section">
              <h3>RULES FOR THE GUIDANCE OF THE CANDIDATES</h3>
              <ol>
                <li>The examination shall be held as per the date and time notified earlier.</li>
                <li>Candidate suffering from any infectious disease must intimate the Superintendent and apply for separate sitting arrangement much ahead of the Examination sitting.</li>
                <li>Candidates shall bring their own blue pen and mathematical instruments. They shall not be allowed to exchange the same in the Examination Hall.</li>
                <li>Candidates must come in College Uniform carrying their Identity Card and Examination Admit Card failing which they shall not be allowed to sit for the Examination.</li>
                <li>Candidates must not carry books, notes, purses/wallet with written or blank papers, mobile phones, digital watches or electronic gadgets in to the examination premises.</li>
                <li>Candidates shall be checked at the gate for Examination and in their seats during Examination and they cannot deny such checks as and when necessary.</li>
                <li>Candidates must reach the gate at least 15 minutes before the commencement of the Examination for such checking. No Candidates shall be allowed entry half an hour after the examination starts. The principal/Center Superintendent may condone another half an hour if the case of coming late is genuine. In no circumstances shall one be allowed after one hour.</li>
                <li>A candidate shall not be allowed for temporary absence nor having the hall permanently in the first hour of the Examination.</li>
                <li>A candidate shall not be avail of temporary absence more than two times and beyond three minutes each time. No one shall be allowed temporary absence in the last half an hour. No candidates shall be allowed to leave hall in the last fifteen minutes of the sitting.</li>
                <li>It is candidate's responsibility to handover his/her answer scripts duly stitched to the invigilator.</li>
                <li>Candidates shall write their Roll Nos., Regd. Nos., Subject, Paper etc. in the specified for the purpose writing Roll Nos. or leaving any identification marks anywhere not specified shall be liable to expulsion/booked under malpractices.</li>
                <li>Candidates shall maintain perfect discipline and must not use any incriminating material nor disturb other candidates in the hall.</li>
                <li>Infringement of any of the Examination rules above or as laid in the rules and regulations of Examination shall be punished as per provision.</li>
              </ol>
            </div>
          </div>

          <div className="preview-actions">
            <button
              type="button"
              className="edit-btn"
              onClick={() => setShowPreview(false)}
            >
              Back to Details
            </button>
            <button
              type="button"
              className="download-btn"
              onClick={generatePDF}
            >
              Download as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmitCard;
