import { useParams, Link } from 'react-router-dom';
import './GradeSheetQRVerify.css';

/** Placeholder payload until API / real verification is wired. */
function getTestVerifyData(studentId) {
  return {
    verificationId: studentId,
    status: 'Verified (Test)',
    college: 'NIMAPARA AUTONOMOUS COLLEGE, NIMAPARA',
    documentType: 'Final Grade Sheet',
    studentName: 'Sample Student Name',
    rollNo: studentId,
    course: 'Sample Course — replace with API data',
    examination: 'POST GRADUATE DEGREE EXAMINATION - 2025',
    cgpa: '8.66',
    result: '1ST CLASS',
    publishedOn: '02/07/2025',
    note:
      'This page shows test data only. Connect your backend to load real verification details for this student.',
  };
}

export default function GradeSheetQRVerify() {
  const { studentId } = useParams();
  const decodedId = studentId ? decodeURIComponent(studentId) : '';
  const data = getTestVerifyData(decodedId);

  if (!decodedId) {
    return (
      <div className="qr-verify-page">
        <div className="qr-verify-card qr-verify-card--error">
          <h1>Invalid QR Code</h1>
          <p>No student identifier was found in this link.</p>
          <Link to="/login" className="qr-verify-link">
            Go to student login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-verify-page">
      <div className="qr-verify-card">
        <header className="qr-verify-header">
          <img src="/college.png" alt="College logo" className="qr-verify-logo" />
          <div>
            <h1>{data.college}</h1>
            <p className="qr-verify-subtitle">Grade Sheet Verification</p>
          </div>
        </header>

        <div className="qr-verify-badge">{data.status}</div>

        <section className="qr-verify-section">
          <h2>Document</h2>
          <dl className="qr-verify-dl">
            <div>
              <dt>Type</dt>
              <dd>{data.documentType}</dd>
            </div>
            <div>
              <dt>Examination</dt>
              <dd>{data.examination}</dd>
            </div>
            <div>
              <dt>Verification ID</dt>
              <dd className="qr-verify-mono">{data.verificationId}</dd>
            </div>
          </dl>
        </section>

        <section className="qr-verify-section">
          <h2>Student (test data)</h2>
          <dl className="qr-verify-dl">
            <div>
              <dt>Name</dt>
              <dd>{data.studentName}</dd>
            </div>
            <div>
              <dt>Roll No.</dt>
              <dd className="qr-verify-mono">{data.rollNo}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>{data.course}</dd>
            </div>
            <div>
              <dt>CGPA</dt>
              <dd>{data.cgpa}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{data.result}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{data.publishedOn}</dd>
            </div>
          </dl>
        </section>

        <p className="qr-verify-note">{data.note}</p>

        <footer className="qr-verify-footer">
          <Link to="/login" className="qr-verify-link">
            Student portal login
          </Link>
        </footer>
      </div>
    </div>
  );
}
