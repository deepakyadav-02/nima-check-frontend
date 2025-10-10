import React, { useState } from "react";
import axios from 'axios';
import config from '../config';
import "./Login.css";

export default function Login({ onLogin }) {
  const [rollNumber, setRollNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      // Validate date input
      if (!dateOfBirth) {
        setError('Please select your date of birth');
        setLoading(false);
        return;
      }

      // Convert the date format before sending to backend
      const formattedDob = formatDateForBackend(dateOfBirth);
      
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
        autonomousRollNo: rollNumber,
        dob: formattedDob
      };

      console.log('Sending login payload:', payload);
      const response = await axios.post(`${config.API_BASE_URL}${config.API_ENDPOINTS.LOGIN}`, payload);
      
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

  // Convert YYYY-MM-DD to DD-MM-YYYY format
  const formatDateForBackend = (dateString) => {
    if (!dateString) return '';
    
    try {
      console.log('📅 Input date string:', dateString);
      
      // Handle YYYY-MM-DD format (from date picker)
      if (dateString.includes('-') && dateString.length === 10) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          // Direct string parsing to avoid timezone issues
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          const formatted = `${day}-${month}-${year}`;
          console.log('📅 Formatted date:', formatted);
          return formatted;
        }
      }
      
      // Handle MM/DD/YYYY format (some mobile browsers)
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const month = String(parts[0]).padStart(2, '0');
          const day = String(parts[1]).padStart(2, '0');
          const year = parts[2];
          const formatted = `${day}-${month}-${year}`;
          console.log('📅 Formatted date:', formatted);
          return formatted;
        }
      }
      
      // Fallback: try Date constructor (less reliable due to timezone)
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        // Use UTC methods to avoid timezone issues
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        const formatted = `${day}-${month}-${year}`;
        console.log('📅 Formatted date (UTC):', formatted);
        return formatted;
      }
      
      throw new Error('Invalid date format');
    } catch (error) {
      console.error('❌ Date formatting error:', error, 'Input:', dateString);
      return ''; // Return empty string on error
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

  return (
    <div className="login-container">
      <div className="login-card">
        {/* College Logo & Name */}
        <div className="college-header">
          <h1 className="system-title">Student Management System</h1>
          <h2 className="login-title">Student Login</h2>
          <p className="login-subtitle">Enter your credentials to access your admit card</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="rollNumber">College Roll Number</label>
            <input
              id="rollNumber"
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Enter your roll number"
              required
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                // Clear error when user starts typing
                if (error) {
                  setError('');
                }
              }}
              required
              disabled={loading}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
              min="1900-01-01" // Reasonable minimum date
            />
            <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
              Select your date of birth (DD/MM/YYYY format)
            </small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div className="footer">
          <p>© 2025 Nimapara Autonomous College</p>
        </div>
      </div>
    </div>
  );
}
