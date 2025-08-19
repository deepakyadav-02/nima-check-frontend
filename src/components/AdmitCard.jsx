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
  const [showPreview, setShowPreview] = useState(true);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const admitCardRef = useRef(null);
  const fileInputRef = useRef(null);

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
      // Temporarily hide photo action buttons
      const photoActions = admitCardRef.current.querySelectorAll('.photo-actions');
      const originalDisplayValues = [];
      
      photoActions.forEach((action, index) => {
        originalDisplayValues[index] = action.style.display;
        action.style.display = 'none';
      });

      // Store original styles to restore later
      const originalStyles = {
        width: admitCardRef.current.style.width,
        maxWidth: admitCardRef.current.style.maxWidth,
        transform: admitCardRef.current.style.transform,
        fontSize: admitCardRef.current.style.fontSize
      };

      // Force original full-size dimensions for PDF generation
      admitCardRef.current.style.width = '750px';
      admitCardRef.current.style.maxWidth = '750px';
      admitCardRef.current.style.transform = 'none';
      admitCardRef.current.style.fontSize = '14px';

      // Use higher scale for better quality and ensure all content is captured
      html2canvas(admitCardRef.current, { 
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: 750, // Reduced width to fit better in A4
        height: admitCardRef.current.scrollHeight,
        backgroundColor: '#ffffff'
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        
        // A4 dimensions in mm
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20; // Increased margin to prevent right side cutoff
        
        // Calculate image dimensions to fit within margins (reduced size)
        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Calculate how many pages we need
        const availablePageHeight = pageHeight - (2 * margin);
        const totalPages = Math.ceil(imgHeight / availablePageHeight);
        
        // Add image to PDF with proper page handling
        let heightLeft = imgHeight;
        let position = 0;
        
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }
          
          // Calculate what portion of the image to show on this page
          const pageImgHeight = Math.min(availablePageHeight, heightLeft);
          
          // Center the image on the page with proper margins
          const x = margin;
          const y = margin;
          
          // Add the image portion to this page (only the current portion)
          pdf.addImage(
            imgData, 
            "PNG", 
            x, 
            y, 
            imgWidth, 
            pageImgHeight,
            undefined,
            'FAST',
            0,
            position
          );
          
          heightLeft -= pageImgHeight;
          position += pageImgHeight;
        }
        
        pdf.save(`admit_card_${studentData.autonomousRollNo}.pdf`);
        
        // Restore original styles
        admitCardRef.current.style.width = originalStyles.width;
        admitCardRef.current.style.maxWidth = originalStyles.maxWidth;
        admitCardRef.current.style.transform = originalStyles.transform;
        admitCardRef.current.style.fontSize = originalStyles.fontSize;
        
        // Restore photo action buttons
        photoActions.forEach((action, index) => {
          action.style.display = originalDisplayValues[index] || '';
        });
      }).catch((error) => {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
        
        // Restore original styles on error
        admitCardRef.current.style.width = originalStyles.width;
        admitCardRef.current.style.maxWidth = originalStyles.maxWidth;
        admitCardRef.current.style.transform = originalStyles.transform;
        admitCardRef.current.style.fontSize = originalStyles.fontSize;
        
        // Restore photo action buttons on error
        photoActions.forEach((action, index) => {
          action.style.display = originalDisplayValues[index] || '';
        });
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

  const getStream = () => {
    if (!studentData?.Department) return '';
    
    const department = studentData.Department.trim();
    
    // ARTS departments
    const artsDepartments = ['Economics', 'Education', 'English', 'History', 'Odia', 'Political Science', 'Psychology', 'Sanskrit'];
    if (artsDepartments.includes(department)) return 'ARTS';
    
    // SCIENCE departments
    const scienceDepartments = ['Botany', 'Chemistry', 'Geology', 'Mathematics', 'Physics', 'Zoology'];
    if (scienceDepartments.includes(department)) return 'SCIENCE';
    
    return department;
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
    // Hide major subject for PG students (no department)
    if (!studentData?.Department) return '';
    
    // For BBA and UG students, show the Department
    return studentData.Department || '';
  };

  const isPGStudent = () => {
    return studentData?.autonomousRollNo?.includes('111NAC');
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedPhoto(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    setUploadedPhoto(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Debug logging
  useEffect(() => {
    if (studentData) {
      console.log('Student Data:', studentData);
      console.log('Department:', studentData.Department);
      console.log('Department trimmed:', studentData.Department?.trim());
      console.log('Is BBA:', studentData.Department && studentData.Department.trim() === 'BBA');
      console.log('Autonomous Roll No:', studentData.autonomousRollNo);
      console.log('VAC-201-I.C value:', studentData['VAC-201-I.C']);
      console.log('All VAC related fields:', {
        'VAC-201-I.C': studentData['VAC-201-I.C'],
        'VAC-201-I.C (bracket notation)': studentData['VAC-201-I.C'],
        'VAC-201-I.C (dot notation)': studentData['VAC-201-I.C'],
        'VAC-201-I.C (quoted)': studentData['VAC-201-I.C']
      });
      
      // Log all fields for BBA students
      if (studentData.Department && studentData.Department.trim() === 'BBA') {
        console.log('BBA Student Fields:', {
          'CC-201': studentData['CC-201'],
          'CC-202': studentData['CC-202'],
          'CC-203': studentData['CC-203'],
          'Multi Disciplinary-201': studentData['Multi Disciplinary-201'],
          'AEC-201': studentData['AEC-201'],
          'SEC-201': studentData['SEC-201'],
          'VAC-201-I': studentData['VAC-201-I'],
          'VAC-201-I.C': studentData['VAC-201-I']?.C
        });
        
        // Check if VAC field exists in the object
        console.log('All object keys:', Object.keys(studentData));
        console.log('VAC-201-I field exists:', 'VAC-201-I' in studentData);
        console.log('VAC-201-I value:', studentData['VAC-201-I']);
        console.log('VAC-201-I.C value:', studentData['VAC-201-I']?.C);
      }
    }
  }, [studentData]);

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
  const stream = getStream();
  const isPG = isPGStudent();

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
                  {!isPG && (
                    <div className="detail-row">
                      <span className="label">STREAM</span>
                      <span className="colon">:</span>
                      <span className="value">
                        {stream || studentType}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">EXAM ROLL NUMBER</span>
                    <span className="colon">:</span>
                    <span className="value">{studentData.rollNo || studentData['College Roll No'] || studentData['Roll No']}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">COLLEGE NUMBER</span>
                    <span className="colon">:</span>
                    <span className="value">{studentData.autonomousRollNo}</span>
                    {majorSubject && (
                      <span className="core-subject">
                        DEPARTMENT - {majorSubject}
                      </span>
                    )}
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
                    {uploadedPhoto ? (
                      <div className="photo-display">
                        <img src={uploadedPhoto} alt="Student Photo" className="student-photo" />
                        <div className="photo-actions">
                          <button 
                            type="button" 
                            className="change-photo-btn"
                            onClick={triggerPhotoUpload}
                          >
                            Change Photo
                          </button>
                          <button 
                            type="button" 
                            className="remove-photo-btn"
                            onClick={removePhoto}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="photo-upload">
                        <div className="photo-placeholder">
                          <span>PHOTO</span>
                        </div>
                        <button 
                          type="button" 
                          className="upload-photo-btn"
                          onClick={triggerPhotoUpload}
                        >
                          Upload Photo
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {isPG ? (
                <div className="course-section">
                  <div className="course-row">
                    <span className="label">COURSE</span>
                    <span className="colon">:</span>
                    <span className="value">{studentData.Course || ''}</span>
                  </div>
                </div>
              ) : (
                <div className="subjects-table">
                  <table>
                    <thead>
                      <tr>
                        {(studentData.Department && studentData.Department.trim() === 'BBA') ? (
                          <>
                            <th>CC-201</th>
                            <th>CC-202</th>
                            <th>CC-203</th>
                            <th>Multi Disciplinary-201</th>
                            <th>AEC-201</th>
                            <th>SEC-201</th>
                            <th>VAC-201-I.C</th>
                          </>
                        ) : (
                          <>
                            <th>Major-3</th>
                            <th>Major-4</th>
                            <th>MINOR-2</th>
                            <th>Multi Disciplinary-2</th>
                            <th>AEC-2</th>
                            <th>SEC-I</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(studentData.Department && studentData.Department.trim() === 'BBA') ? (
                          <>
                            <td>{studentData['CC-201'] || ''}</td>
                            <td>{studentData['CC-202'] || ''}</td>
                            <td>{studentData['CC-203'] || ''}</td>
                            <td>{studentData['Multi Disciplinary-201'] || ''}</td>
                            <td>{studentData['AEC-201'] || ''}</td>
                            <td>{studentData['SEC-201'] || ''}</td>
                            <td>{studentData['VAC-201-I']?.C || ''}</td>
                          </>
                        ) : (
                          <>
                            <td>{studentData['Major-3'] || ''}</td>
                            <td>{studentData['Major-4'] || ''}</td>
                            <td>{studentData['MINOR-2'] || ''}</td>
                            <td>{studentData['Multi Disciplinary-2'] || ''}</td>
                            <td>{studentData['AEC-2'] || ''}</td>
                            <td>{studentData['SEC-I'] || ''}</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="undertaking">
              <p>I undertake to abide by the rules printed below.</p>
            </div>

            <div className="signatures">
              <div className="signature-section">
                <div className="principal-sign">
                  <img src="/PRINCIPAL.jpg" alt="Principal Signature" className="signature-image"/>
                  <p>PRINCIPAL/CENTRE SUPERINTENDENT</p>
                </div>
                
                <div className="controller-sign">
                  <div className="student-sign">
                    <div className="signature-box"></div>
                    <p>Signature of the Student in Full</p>
                  </div>
                  <img src="/EXAMINER.jpg" alt="Controller Signature" className="signature-image"/>
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
