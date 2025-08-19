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
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert the date format before sending to backend
      const payload = {
        autonomousRollNo: formData.autonomousRollNo,
        dob: formatDateForBackend(formData.dob)
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
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              required
            />
            <small>Select your date of birth (will be converted to DD-MM-YYYY format)</small>
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
