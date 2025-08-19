import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    autonomousRollNo: '',
    dob: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Convert YYYY-MM-DD to DD-MM-YYYY format
  const formatDateForBackend = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('-')) {
        // If it's already in YYYY-MM-DD format
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        // If it's in MM/DD/YYYY format (mobile might send this)
        const parts = dateString.split('/');
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      } else {
        // Fallback to direct Date constructor
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString; // Return original if formatting fails
    }
  };

  // Validate date format (dd-mm-yyyy)
  const validateDateFormat = (dateString) => {
    if (!dateString) return false;
    
    // Check if it matches dd-mm-yyyy format
    const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateString.match(dateRegex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Validate day, month, year ranges
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Additional validation for specific months
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2) {
      // February - check for leap year
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (day > (isLeapYear ? 29 : 28)) return false;
    } else if (day > daysInMonth[month - 1]) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove focus from any input fields to prevent date picker from opening
    if (document.activeElement) {
      document.activeElement.blur();
    }
    
    setLoading(true);
    setError('');

    try {
      // Validate date input
      if (!formData.dob) {
        setError('Please select your date of birth');
        setLoading(false);
        return;
      }

      // Convert the date format before sending to backend
      const formattedDob = formatDateForBackend(formData.dob);
      
      if (!formattedDob) {
        setError('Invalid date format. Please try again.');
        setLoading(false);
        return;
      }

      // Validate the formatted date is in dd-mm-yyyy format
      if (!validateDateFormat(formattedDob)) {
        setError('Date must be in DD-MM-YYYY format (e.g., 15-07-2002)');
        setLoading(false);
        return;
      }

      const payload = {
        autonomousRollNo: formData.autonomousRollNo,
        dob: formattedDob
      };

      console.log('Sending login payload:', payload);
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, payload);
      
      console.log('Login API response:', response.data);
      
      // Backend returns 'user' and 'token', not 'student' and 'success'
      if (response.data.token && response.data.user) {
        console.log('Login successful, calling onLogin with:', response.data.user, response.data.token);
        onLogin(response.data.user, response.data.token);
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 404) {
        setError('Student not found. Please check your Roll No and Date of Birth.');
      } else if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your Roll No and Date of Birth.');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Student Login</h2>
          <p>Enter your credentials to access your admit card</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="autonomousRollNo">Autonomous Roll Number</label>
            <input
              type="text"
              id="autonomousRollNo"
              name="autonomousRollNo"
              value={formData.autonomousRollNo}
              onChange={handleInputChange}
              placeholder="e.g., NACBBA24-001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dob">Date of Birth (DD-MM-YYYY)</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              onBlur={() => {
                // Ensure date input loses focus when form is submitted
                if (document.activeElement === document.getElementById('dob')) {
                  document.getElementById('dob').blur();
                }
              }}
              required
            />
            <small>Select your date of birth. Will be converted to DD-MM-YYYY format (e.g., 15-07-2002)</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading}
            onClick={(e) => {
              // Ensure date input loses focus when button is clicked
              const dobInput = document.getElementById('dob');
              if (dobInput && document.activeElement === dobInput) {
                dobInput.blur();
              }
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-help">
          <p>Need help? Contact your college administration.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
