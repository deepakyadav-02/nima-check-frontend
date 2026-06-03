import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyPGGradeSheetBySlNo } from '../services/marksheetService';
import CollegeNameHeading from './CollegeNameHeading';
import './GradeSheetQRVerify.css';

export default function PGGradeSheetQRVerify() {
  const { slNo } = useParams();
  const decodedSl = slNo ? decodeURIComponent(slNo).trim() : '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!decodedSl) {
      setLoading(false);
      setError('No serial number in this link.');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyPGGradeSheetBySlNo(decodedSl);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Verification failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [decodedSl]);

  if (!decodedSl) {
    return (
      <div className="qr-verify-page">
        <div className="qr-verify-card qr-verify-card--error">
          <h1>Invalid QR Code</h1>
          <p>No serial number was found in this link.</p>
          <Link to="/login" className="qr-verify-link">
            Go to student login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="qr-verify-page">
        <div className="qr-verify-card qr-verify-card--loading">
          <p>Loading verification…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="qr-verify-page">
        <div className="qr-verify-card qr-verify-card--error">
          <h1>Not Found</h1>
          <p>{error || 'No record matches this serial number.'}</p>
          <p className="qr-verify-mono">SL No. {decodedSl}</p>
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
            <CollegeNameHeading as="h1" />
            <p className="qr-verify-subtitle">PG Mark Sheet Cum Grade Sheet — Verification</p>
          </div>
        </header>

        <div className="qr-verify-badge">Verified</div>

        <section className="qr-verify-section">
          <h2>Student</h2>
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
              <dt>Grand Total</dt>
              <dd className="qr-verify-mono">{data.grandTotal}</dd>
            </div>
          </dl>
        </section>

        <p className="qr-verify-note qr-verify-mono">SL No. {data.gradeSheetSlNo || decodedSl}</p>

        <footer className="qr-verify-footer">
          <Link to="/login" className="qr-verify-link">
            Student portal login
          </Link>
        </footer>
      </div>
    </div>
  );
}
