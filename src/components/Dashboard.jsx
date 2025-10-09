import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome, {user?.name || user?.['Name of the Students'] || user?.['Applicant Name'] || 'Student'}</h1>
          <p className="roll-number">Roll Number: {user?.autonomousRollNo}</p>
          <p className="course-info">
            {user?.Department && `Department: ${user.Department}`}
            {user?.Course && ` | Course: ${user.Course}`}
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        <h2 className="section-title">Student Portal</h2>
        
        <div className="dashboard-grid">
          {/* Admit Card */}
          <div className="dashboard-card" onClick={() => navigate('/admit-card')}>
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3>Admit Card</h3>
            <p>View and download your examination admit card</p>
            <div className="card-arrow">→</div>
          </div>

          {/* Profile */}
          <div className="dashboard-card" onClick={() => navigate('/profile')}>
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3>My Profile</h3>
            <p>View your personal and academic information</p>
            <div className="card-arrow">→</div>
          </div>

          {/* Results */}
          <div className="dashboard-card" onClick={() => navigate('/marksheet')}>
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3>Examination Results</h3>
            <p>Check your examination results and grades</p>
            <div className="card-arrow">→</div>
          </div>

          {/* Attendance */}
          <div className="dashboard-card coming-soon">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3>Attendance</h3>
            <p>View your attendance records and percentage</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>

          {/* Academic Calendar */}
          <div className="dashboard-card coming-soon">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <line x1="8" y1="14" x2="8" y2="14"></line>
                <line x1="12" y1="14" x2="12" y2="14"></line>
                <line x1="16" y1="14" x2="16" y2="14"></line>
                <line x1="8" y1="18" x2="8" y2="18"></line>
                <line x1="12" y1="18" x2="12" y2="18"></line>
                <line x1="16" y1="18" x2="16" y2="18"></line>
              </svg>
            </div>
            <h3>Academic Calendar</h3>
            <p>View important dates and exam schedules</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>

          {/* Notifications */}
          <div className="dashboard-card coming-soon">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <h3>Notifications</h3>
            <p>Stay updated with important announcements</p>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <h3>Quick Information</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Roll Number</div>
              <div className="stat-value">{user?.autonomousRollNo}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Exam Roll Number</div>
              <div className="stat-value">{user?.rollNo || user?.['College Roll No'] || 'N/A'}</div>
            </div>
            {user?.Department && (
              <div className="stat-item">
                <div className="stat-label">Department</div>
                <div className="stat-value">{user.Department}</div>
              </div>
            )}
            {user?.Course && (
              <div className="stat-item">
                <div className="stat-label">Course</div>
                <div className="stat-value">{user.Course}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

