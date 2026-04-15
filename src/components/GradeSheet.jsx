import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import gradeSheetData from '../data/gradeSheetData.json';
import { fetchMarksheetsByRollNo } from '../services/marksheetService';
import './GradeSheet.css';
import { normalizeDeptKey, getPGRowMarks, sumPGTotals, toNum } from '../utils/marksheetUtils';

export default function GradeSheet({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(gradeSheetData);
  const [marksheetData, setMarksheetData] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('1');
  const [showGradeSheet, setShowGradeSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const gradeSheetRef = useRef(null);

  useEffect(() => {
    if (!showGradeSheet || !selectedYear || !selectedSem) {
      setLoading(false);
      return;
    }
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSem, selectedYear, showGradeSheet]);

  const hasAny = (v) => v !== null && v !== undefined && String(v).trim() !== '';

  const isPGLikeCourseRow = (course) => {
    if (!course || typeof course !== 'object') return false;
    // PG rows commonly carry midsem/endsem/practical + marks; UG rows carry theory/internal/practical.
    return (
      hasAny(course.midsem) ||
      hasAny(course.endsem) ||
      hasAny(course.practical) ||
      hasAny(course.marks)
    );
  };

  const detectIsPGMarksheetLayout = (courses) => {
    if (!Array.isArray(courses) || courses.length === 0) return false;
    return courses.some(isPGLikeCourseRow);
  };

  const isPGUser = String(user?.studentType || '').toUpperCase() === 'PG';

  const deptKeyForPgTable = normalizeDeptKey(
    marksheetData?.department ?? data?.studentInfo?.course ?? ''
  );

  const buildSecondSemMarksheetData = (secondSemRow) => {
    const isBBA =
      String(secondSemRow?.Department || '').toUpperCase().includes('BBA') ||
      secondSemRow?.['CC-201'] != null;

    const ugSubjects = [
      { key: 'Major-3', courseType: 'Major-3', subjectCode: 'MAJOR-3' },
      { key: 'Major-4', courseType: 'Major-4', subjectCode: 'MAJOR-4' },
      { key: 'MINOR-2(20)', courseType: 'Minor-2', subjectCode: 'MINOR-2' },
      { key: 'Multi Disciplinary-2', courseType: 'MDC-2', subjectCode: 'MDC-2' },
      { key: 'AEC-2', courseType: 'AEC-2', subjectCode: 'AEC-2' },
      { key: 'SEC-I', courseType: 'SEC-I', subjectCode: 'SEC-I' },
    ];

    const bbaKeys = [
      'CC-201',
      'CC-202',
      'CC-203',
      'AEC-201',
      'SEC-201',
      'MDC-201',
      'VAC-201-I.C',
    ];

    // BBA 2nd-sem JSON has no per-subject CreditPoint; credits follow curriculum (total 27, same scale as BBA 1st sem).
    const bbaSem2CreditsByCode = {
      'CC-201': 4,
      'CC-202': 4,
      'CC-203': 4,
      'AEC-201': 4,
      'SEC-201': 4,
      'MDC-201': 4,
      'VAC-201-I.C': 3,
    };

    let courses = [];

    if (isBBA) {
      courses = bbaKeys
        .map((key) => {
          const s = secondSemRow?.[key];
          if (!s || typeof s !== 'object') return null;
          const gradePoint = toNum(s['Grade Point']);
          const creditPointFromJson =
            toNum(s.CreditPoint) ?? toNum(s['Credit Point']) ?? toNum(s.creditPoint);
          const prescribed = bbaSem2CreditsByCode[key];
          let creditVal = null;
          let creditPointVal = null;

          if (creditPointFromJson !== null) {
            creditPointVal = creditPointFromJson;
            if (gradePoint === 0 && creditPointFromJson === 0) {
              creditVal = 0;
            } else if (gradePoint !== null && gradePoint !== 0) {
              creditVal = creditPointFromJson / gradePoint;
            } else if (prescribed != null) {
              creditVal = prescribed;
            }
          } else if (prescribed != null && gradePoint !== null) {
            creditVal = prescribed;
            creditPointVal = prescribed * gradePoint;
          }

          return {
            subjectCode: key,
            courseType: key,
            subjectName: s.Subject || '',
            credit: creditVal === null ? '' : Number(creditVal.toFixed(0)),
            grade: s.Grade || '',
            gradePoint: gradePoint ?? '',
            creditPoint: creditPointVal === null ? '' : Number(creditPointVal.toFixed(0)),
          };
        })
        .filter(Boolean);
    } else {
      courses = ugSubjects
        .map(({ key, courseType, subjectCode }) => {
          const s = secondSemRow?.[key];
          if (!s) return null;

          const gradePoint = toNum(s['Grade Point']);
          const creditPoint = toNum(s.CreditPoint);
          const derivedCredit =
            gradePoint === 0 && creditPoint === 0
              ? 0
              : gradePoint !== null && gradePoint !== 0 && creditPoint !== null
                ? creditPoint / gradePoint
                : null;

          return {
            subjectCode,
            courseType,
            subjectName: s.Subject || '',
            credit: derivedCredit === null ? '' : Number(derivedCredit.toFixed(0)),
            grade: s.Grade || '',
            gradePoint: gradePoint ?? '',
            creditPoint: creditPoint ?? '',
          };
        })
        .filter(Boolean);
    }

    const totalGradePoints = courses.reduce(
      (sum, c) => sum + (typeof c.gradePoint === 'number' ? c.gradePoint : 0),
      0
    );

    const sumRowCredits = courses.reduce(
      (sum, c) => sum + (typeof c.credit === 'number' ? c.credit : 0),
      0
    );
    const sumRowCreditPoints = courses.reduce(
      (sum, c) => sum + (typeof c.creditPoint === 'number' ? c.creditPoint : 0),
      0
    );

    let totalCreditsOut = toNum(secondSemRow?.TotalCredit);
    let totalCreditPointsOut = toNum(secondSemRow?.TotalCreditPoint);
    let sgpaOut = toNum(secondSemRow?.SGPA);

    if (isBBA) {
      if (totalCreditsOut === null && sumRowCredits > 0) totalCreditsOut = sumRowCredits;
      if (totalCreditPointsOut === null && sumRowCreditPoints > 0) {
        totalCreditPointsOut = sumRowCreditPoints;
      }
      if (
        sgpaOut === null &&
        totalCreditsOut != null &&
        totalCreditPointsOut != null &&
        totalCreditsOut > 0
      ) {
        sgpaOut = Number((totalCreditPointsOut / totalCreditsOut).toFixed(2));
      }
    }

    return {
      courses,
      totalCredits: totalCreditsOut ?? '',
      totalCreditPoints: totalCreditPointsOut ?? '',
      totalGradePoints: Number(totalGradePoints.toFixed(2)),
      sgpa: sgpaOut ?? '',
      publicationDate: data.publicationDate,
      classification: secondSemRow?.Classification || 'N/A',
    };
  };

  const buildPGSecondSemMarksheetData = (pgRow) => {
    const courses = Array.isArray(pgRow?.courses)
      ? pgRow.courses.map((c) => ({
          subjectCode: c.courseType || '',
          courseType: c.courseType || '',
          subjectName: c.subjectName || '',
          credit: c.credit ?? '',
          grade: c.grade ?? '',
          gradePoint: c.gradePoint ?? '',
          creditPoint: c.creditPoint ?? '',
          // keep raw marks for reference in table (if table shows)
          marks: c.marks ?? '',
          midsem: c.midsem ?? '',
          endsem: c.endsem ?? '',
          practical: c.practical ?? '',
        }))
      : [];

    const totalGradePoints = courses.reduce(
      (sum, c) => sum + (typeof c.gradePoint === 'number' ? c.gradePoint : 0),
      0
    );

    return {
      courses,
      totalCredits: pgRow?.totalCredits ?? '',
      totalCreditPoints: pgRow?.totalCreditPoints ?? '',
      totalGradePoints: Number(totalGradePoints.toFixed(2)),
      sgpa: pgRow?.sgpa ?? '',
      publicationDate: data.publicationDate,
      classification: pgRow?.classification || 'N/A',
    };
  };

  const formatCourseName = (v) => {
    const s = v == null ? '' : String(v).trim();
    if (!s) return '';
    // Prefer keeping acronyms as-is (e.g., ODIA), but normalize mixed-case words.
    if (/^[A-Z\s-]+$/.test(s)) return s;
    return s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  };

  const detectMediumOfExam = (departmentOrCourse) => {
    const raw = departmentOrCourse == null ? '' : String(departmentOrCourse).trim();
    const u = raw.toUpperCase();
    if (!u) return 'ENGLISH';
    if (u.includes('ODIA')) return 'ODIA';
    if (u.includes('CHEM') || u.includes('GEO') || u.includes('MATH') || u.includes('COMMERCE')) {
      return 'ENGLISH';
    }
    return 'ENGLISH';
  };

  const buildPGCourseLine = (departmentOrCourse) => {
    const raw = departmentOrCourse == null ? '' : String(departmentOrCourse).trim();
    const u = raw.toUpperCase();
    if (!u) return '';
    if (u.includes('COMMERCE')) return 'MASTER IN COMMERCE';
    return `MASTER OF SCIENCE IN ${u}`;
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      // Prevent showing previous semester's data if the new fetch fails
      setMarksheetData(null);
      const autonomousRollNo = user?.autonomousRollNo || user?.['Autonomous Roll No'];
      
      if (!autonomousRollNo) {
        console.log('No autonomous roll number found, using default data');
        setLoading(false);
        return;
      }

      if (selectedSem === '2') {
        const { secondSem2024: secondSemRow, pgSecondSem2024 } =
          await fetchMarksheetsByRollNo(autonomousRollNo);

        // PG 2nd sem (camelCase row from pg2ndsem2024)
        if (pgSecondSem2024) {
          setMarksheetData(buildPGSecondSemMarksheetData(pgSecondSem2024));

          const courseName = formatCourseName(pgSecondSem2024.department || pgSecondSem2024.course);
          const detectedLanguage = detectMediumOfExam(courseName || pgSecondSem2024.department || pgSecondSem2024.course);

          setData((prevData) => ({
            ...prevData,
            studentInfo: {
              ...prevData.studentInfo,
              name: pgSecondSem2024.applicantName || prevData.studentInfo.name,
              examRollNo: pgSecondSem2024.collegeRollNo || prevData.studentInfo.examRollNo,
              registrationNo:
                pgSecondSem2024.autonomousRollNo || prevData.studentInfo.registrationNo,
              mediumOfExam: detectedLanguage || prevData.studentInfo.mediumOfExam,
              course: courseName ? buildPGCourseLine(courseName) : prevData.studentInfo.course,
              coreTwo: '',
            },
          }));

          return;
        }

        if (secondSemRow) {
          const apiStudentInfo = {
            name: secondSemRow['Name of the Students'],
            autonomousRollNo: secondSemRow['Autonomous Roll No'],
            rollNo: secondSemRow['Roll No'],
            department: secondSemRow.Department,
          };

          setMarksheetData(buildSecondSemMarksheetData(secondSemRow));

          const isBbaRow =
            String(secondSemRow?.Department || '').toUpperCase().includes('BBA') ||
            secondSemRow?.['CC-201'] != null;
          const majorSubject = isBbaRow
            ? secondSemRow?.['CC-201']?.Subject || ''
            : secondSemRow?.['Major-3']?.Subject || secondSemRow?.['Major-4']?.Subject || '';
          const minorSubject = isBbaRow
            ? secondSemRow?.['CC-202']?.Subject || ''
            : secondSemRow?.['MINOR-2(20)']?.Subject || '';
          const aecSubject = isBbaRow
            ? secondSemRow?.['AEC-201']?.Subject || ''
            : secondSemRow?.['AEC-2']?.Subject || '';
          const detectedLanguage =
            String(aecSubject).toLowerCase().includes('odia')
              ? 'ODIA'
              : detectMediumOfExam(apiStudentInfo.department);

          setData(prevData => ({
            ...prevData,
            studentInfo: {
              ...prevData.studentInfo,
              name: apiStudentInfo.name || prevData.studentInfo.name,
              examRollNo: apiStudentInfo.rollNo || prevData.studentInfo.examRollNo,
              registrationNo: apiStudentInfo.autonomousRollNo || prevData.studentInfo.registrationNo,
              mediumOfExam: detectedLanguage || prevData.studentInfo.mediumOfExam,
              course: majorSubject ? `CORE-1: ${String(majorSubject).toUpperCase()}` : prevData.studentInfo.course,
              coreTwo: minorSubject ? `CORE-2: ${String(minorSubject).toUpperCase()}` : prevData.studentInfo.coreTwo,
            }
          }));
        }
        return;
      }

      // Semester 1 (existing flow): Fetch marksheets data using the service
      const { marksheets, studentInfo: apiStudentInfo } = await fetchMarksheetsByRollNo(autonomousRollNo);

      if (apiStudentInfo && marksheets && marksheets.length > 0) {
        const sem1Marksheet = marksheets.find(m => String(m.semester) === '1') || marksheets[0];
        
        // Store the marksheet data (courses, totals, sgpa)
        // Format createdAt date to DD/MM/YYYY
        let publicationDate = data.publicationDate; // fallback to default
        if (sem1Marksheet.createdAt) {
          const date = new Date(sem1Marksheet.createdAt);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          publicationDate = `${day}/${month}/${year}`;
        }
        
        setMarksheetData({
          courses: sem1Marksheet.courses || [],
          totalCredits: sem1Marksheet.totalCredits || 0,
          totalCreditPoints: sem1Marksheet.totalCreditPoints || 0,
          totalGradePoints: Number(((sem1Marksheet.courses || []).reduce((sum, c) => sum + (typeof c?.gradePoint === 'number' ? c.gradePoint : 0), 0)).toFixed(2)),
          sgpa: sem1Marksheet.sgpa || 0,
          publicationDate: publicationDate,
          classification: sem1Marksheet.classification || 'N/A'
        });
        
        const deptFromApi = formatCourseName(apiStudentInfo?.department);
        const looksPG = detectIsPGMarksheetLayout(sem1Marksheet?.courses || []);

        // PG 1st sem medium of exam is department-based:
        // - ODIA dept => ODIA
        // - MATH/CHEMISTRY/COMMERCE/GEOLOGY => ENGLISH
        // (default ENGLISH)
        const language = looksPG ? detectMediumOfExam(deptFromApi || apiStudentInfo?.department) : 'ENGLISH';
        const courseInfo = looksPG
          ? deptFromApi
            ? buildPGCourseLine(deptFromApi)
            : data.studentInfo.course
          : data.studentInfo.course;

        // Keep CORE-2 only for UG-like semester-1 view; PG reference format doesn't use CORE lines.
        let coreTwoInfo = data.studentInfo.coreTwo;
        if (!looksPG) {
          if (sem1Marksheet.courses && sem1Marksheet.courses.length > 0) {
            const minorCourse = sem1Marksheet.courses.find(course =>
              course.courseType && course.courseType.toLowerCase().startsWith('minor')
            );
            coreTwoInfo = minorCourse?.subjectName ? `CORE-2: ${minorCourse.subjectName.toUpperCase()}` : '';
          }
        } else {
          coreTwoInfo = '';
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
              coreTwo: coreTwoInfo
            }
          };
          return newData;
        });
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      setErrorMessage(err?.message || 'Failed to load gradesheet data');
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

  if (!showGradeSheet) {
    return (
      <div className="grade-sheet-container">
        <div className="grade-sheet-header">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>Grade Sheet</h1>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '18px',
            background: '#fff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            maxWidth: '720px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px' }}>Select Year</h2>
          <p style={{ marginTop: '8px', marginBottom: '14px', color: '#4b5563' }}>
            Choose the admission batch/year to view your gradesheet.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="download-pdf-btn"
              onClick={() => setSelectedYear('2024')}
              style={{ width: 'auto' }}
            >
              Admission Batch 2024
            </button>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Select Semester</h2>
            <p style={{ marginTop: '8px', marginBottom: '14px', color: '#4b5563' }}>
              Choose which semester gradesheet you want to view.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="download-pdf-btn"
                onClick={() => setSelectedSem('1')}
                style={{
                  width: 'auto',
                  background: selectedSem === '1' ? undefined : '#f3f4f6',
                  color: selectedSem === '1' ? undefined : '#111827',
                }}
              >
                1st Sem
              </button>
              <button
                className="download-pdf-btn"
                onClick={() => setSelectedSem('2')}
                style={{
                  width: 'auto',
                  background: selectedSem === '2' ? undefined : '#f3f4f6',
                  color: selectedSem === '2' ? undefined : '#111827',
                }}
              >
                2nd Sem
              </button>
            </div>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="download-pdf-btn"
              disabled={!selectedYear || !selectedSem}
              onClick={() => setShowGradeSheet(true)}
              style={{ width: 'auto' }}
            >
              View Grade Sheet
            </button>
            {!selectedYear ? (
              <span style={{ color: '#6b7280' }}>Select a year to continue.</span>
            ) : null}
          </div>
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
        <h1>Grade Sheet</h1>
        <select
          value={selectedSem}
          onChange={(e) => setSelectedSem(e.target.value)}
          disabled={loading || downloading}
          style={{ marginLeft: '12px', padding: '8px' }}
        >
          <option value="1">1st Sem</option>
          <option value="2">2nd Sem</option>
        </select>
        <button 
          onClick={generatePDF} 
          className="download-pdf-btn"
          disabled={downloading || loading}
        >
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>
        <button
          onClick={() => {
            setShowGradeSheet(false);
            setErrorMessage('');
            setMarksheetData(null);
          }}
          className="btn-back"
          style={{ marginLeft: '12px' }}
          disabled={downloading}
        >
          Change Year/Sem
        </button>
      </div>

      {errorMessage ? (
        <div style={{ margin: '12px 0', padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: '6px' }}>
          {errorMessage}
        </div>
      ) : null}

      <div className="grade-sheet-document" ref={gradeSheetRef}>
        {/* Document Title */}
        <div className="document-header">
          <img src="/college.png" alt="College Logo" className="college-logo" />
          <div className="document-header-text">
            <h1 className="exam-title">NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA</h1>
            <h2 className="document-type">{isPGUser ? 'MARK SHEET CUM GRADE SHEET' : 'GRADE SHEET'}</h2>
            <p className="document-subtitle">
              {selectedSem === '2'
                ? `SECOND-SEMESTER EXAMINATION(ADMISSION-BATCH${selectedYear})`
                : `FIRST-SEMESTER(ADMISSION-BATCH${selectedYear})`}
            </p>
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
          {(() => {
            // UG should show grade-only table; PG shows marks+grade table
            const isPGLayout = isPGUser;
            const tableClass = `grade-table${isPGLayout ? ' pg-marksheet-table' : ''}`;
            return (
          <table className={tableClass}>
            <thead>
              {isPGLayout ? (
                <>
                  <tr>
                    <th rowSpan={2}>SUBJECT</th>
                    <th rowSpan={2}>COURSE</th>
                    <th colSpan={2}>MID SEM</th>
                    <th colSpan={2}>END SEM</th>
                    <th colSpan={2}>TOTAL</th>
                    <th rowSpan={2}>CREDIT</th>
                    <th rowSpan={2}>GRADE</th>
                    <th rowSpan={2}>GP</th>
                    <th rowSpan={2}>CP</th>
                  </tr>
                  <tr>
                    <th>FM</th>
                    <th>MS</th>
                    <th>FM</th>
                    <th>MS</th>
                    <th>FM</th>
                    <th>MS</th>
                  </tr>
                </>
              ) : (
                <tr>
                  <th>SUBJECT</th>
                  <th>COURSE</th>
                  <th>CREDIT</th>
                  <th>GRADE</th>
                  <th>GRADE POINT</th>
                  <th>CREDIT POINT</th>
                </tr>
              )}
            </thead>
            <tbody>
              {marksheetData ? (
                // Use API data if available
                <>
                  {(() => {
                    let majorCount = 0;
                    return marksheetData.courses.map((course, index) => {
                    const courseType = course.courseType || '';
                    const normalizedType = courseType.toLowerCase();
                    let displayCourseType = courseType.toUpperCase();

                    if (normalizedType.startsWith('major')) {
                        majorCount += 1;
                        // UG 2nd sem should show Major-3 and Major-4
                        if (selectedSem === '2') {
                          displayCourseType = `CORE-1 MAJOR-${majorCount + 2}`;
                        } else {
                          displayCourseType = `CORE-1 MAJOR-${majorCount}`;
                        }
                    } else if (normalizedType.startsWith('minor')) {
                        // UG 2nd sem should show Minor-2
                        displayCourseType = selectedSem === '2' ? 'CORE-2 MINOR-2' : 'CORE-2 MINOR-1';
                    } else if (normalizedType.includes('mdc')) {
                        displayCourseType = selectedSem === '2' ? 'MDC-2' : 'MDC-1';
                    } else if (normalizedType.includes('aec')) {
                        displayCourseType = selectedSem === '2' ? 'AEC-2' : 'AEC-1';
                    } else if (normalizedType.includes('vac')) {
                        displayCourseType = 'VAC-1';
                    }

                    return (
                      <tr key={index}>
                        <td>{course.subjectName}</td>
                        <td>{displayCourseType}</td>
                        {isPGLayout ? (
                          <>
                            {(() => {
                              const m = getPGRowMarks(course, deptKeyForPgTable);
                              return (
                                <>
                                  <td>{m.midFm}</td>
                                  <td>{m.midMs}</td>
                                  <td>{m.endFm}</td>
                                  <td>{m.endMs}</td>
                                  <td>{m.totalFm}</td>
                                  <td><strong>{m.totalMs}</strong></td>
                                </>
                              );
                            })()}
                            <td>{course.credit}</td>
                            <td>{course.grade}</td>
                            <td>{course.gradePoint}</td>
                            <td>{course.creditPoint}</td>
                          </>
                        ) : (
                          <>
                            <td>{course.credit}</td>
                            <td>{course.grade}</td>
                            <td>{course.gradePoint}</td>
                            <td>{course.creditPoint}</td>
                          </>
                        )}
                      </tr>
                    );
                  });
                  })()}
                  <tr className="total-row">
                    <td colSpan={2} className="total-label">TOTAL</td>
                    {isPGLayout ? (
                      <>
                        {(() => {
                          const t = sumPGTotals(marksheetData?.courses || [], deptKeyForPgTable);
                          return (
                            <>
                              <td><strong>{t.midFm}</strong></td>
                              <td><strong>{t.midMs}</strong></td>
                              <td><strong>{t.endFm}</strong></td>
                              <td><strong>{t.endMs}</strong></td>
                              <td><strong>{t.totalFm}</strong></td>
                              <td><strong>{t.totalMs}</strong></td>
                            </>
                          );
                        })()}
                        <td>{marksheetData.totalCredits}</td>
                        <td></td>
                        <td>{marksheetData.totalGradePoints ?? ''}</td>
                        <td>{marksheetData.totalCreditPoints}</td>
                      </>
                    ) : (
                      <>
                        <td>{marksheetData.totalCredits}</td>
                        <td></td>
                        <td>{marksheetData.totalGradePoints ?? ''}</td>
                        <td>{marksheetData.totalCreditPoints}</td>
                      </>
                    )}
                  </tr>
                </>
              ) : (
                // Fallback to JSON data
                <>
                  {data.gradeDetails.map((subject, index) => (
                    <tr key={index}>
                      <td>{subject.courseTitle || subject.course}</td>
                      <td>{subject.course}</td>
                      <td>{subject.credit}</td>
                      <td>{subject.grade}</td>
                      <td>{subject.gradePoint}</td>
                      <td>{subject.creditPoint}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2} className="total-label">TOTAL</td>
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
          })()}
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
            <img src="/PRINCIPAL.jpg" alt="Principal Signature" className="signature-image" />
            <div className="signature-label">Principal Signature</div>
          </div>
        </div>

        <div className="disclaimer">
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}

