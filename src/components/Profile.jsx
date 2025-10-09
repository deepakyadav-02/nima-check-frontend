import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile({ user }) {
  const navigate = useNavigate();

  const getStudentType = () => {
    if (user?.autonomousRollNo?.includes('BBA')) return 'BBA Student';
    if (user?.autonomousRollNo?.includes('NAC24')) return 'UG Student';
    if (user?.autonomousRollNo?.includes('111NAC')) return 'PG Student';
    return 'Student';
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-photo-section">
            <div className="profile-photo-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2>{user?.name || user?.['Name of the Students'] || user?.['Applicant Name'] || 'Student'}</h2>
            <p className="student-type">{getStudentType()}</p>
          </div>

          <div className="profile-details">
            <h3>Personal Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name</span>
                <span className="detail-value">{user?.name || user?.['Name of the Students'] || user?.['Applicant Name'] || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">College Roll Number</span>
                <span className="detail-value">{user?.autonomousRollNo || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Exam Roll Number</span>
                <span className="detail-value">{user?.rollNo || user?.['College Roll No'] || user?.['Roll No'] || 'N/A'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Date of Birth</span>
                <span className="detail-value">{user?.dob || user?.['Date of Birth'] || 'N/A'}</span>
              </div>

              {user?.Department && (
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{user.Department}</span>
                </div>
              )}

              {user?.Course && (
                <div className="detail-item">
                  <span className="detail-label">Course</span>
                  <span className="detail-value">{user.Course}</span>
                </div>
              )}

              {user?.['Father Name'] && (
                <div className="detail-item">
                  <span className="detail-label">Father's Name</span>
                  <span className="detail-value">{user['Father Name']}</span>
                </div>
              )}

              {user?.['Mother Name'] && (
                <div className="detail-item">
                  <span className="detail-label">Mother's Name</span>
                  <span className="detail-value">{user['Mother Name']}</span>
                </div>
              )}

              {user?.Mobile && (
                <div className="detail-item">
                  <span className="detail-label">Mobile</span>
                  <span className="detail-value">{user.Mobile}</span>
                </div>
              )}

              {user?.Email && (
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.Email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Academic Information */}
          {(user?.['Major-3'] || user?.['CC-201']) && (
            <div className="profile-details">
              <h3>Academic Information</h3>
              <div className="subjects-info">
                {user?.Department === 'BBA' ? (
                  <>
                    {user?.['CC-201'] && <div className="subject-chip">CC-201: {user['CC-201']}</div>}
                    {user?.['CC-202'] && <div className="subject-chip">CC-202: {user['CC-202']}</div>}
                    {user?.['CC-203'] && <div className="subject-chip">CC-203: {user['CC-203']}</div>}
                    {user?.['Multi Disciplinary-201'] && <div className="subject-chip">Multi Disciplinary: {user['Multi Disciplinary-201']}</div>}
                    {user?.['AEC-201'] && <div className="subject-chip">AEC-201: {user['AEC-201']}</div>}
                    {user?.['SEC-201'] && <div className="subject-chip">SEC-201: {user['SEC-201']}</div>}
                  </>
                ) : (
                  <>
                    {user?.['Major-3'] && <div className="subject-chip">Major-3: {user['Major-3']}</div>}
                    {user?.['Major-4'] && <div className="subject-chip">Major-4: {user['Major-4']}</div>}
                    {user?.['MINOR-2'] && <div className="subject-chip">MINOR-2: {user['MINOR-2']}</div>}
                    {user?.['Multi Disciplinary-2'] && <div className="subject-chip">Multi Disciplinary: {user['Multi Disciplinary-2']}</div>}
                    {user?.['AEC-2'] && <div className="subject-chip">AEC-2: {user['AEC-2']}</div>}
                    {user?.['SEC-I'] && <div className="subject-chip">SEC-I: {user['SEC-I']}</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button onClick={() => navigate('/admit-card')} className="action-btn primary">
            View Admit Card
          </button>
          <button onClick={() => navigate('/dashboard')} className="action-btn secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

