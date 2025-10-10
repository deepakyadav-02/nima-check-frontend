import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdmitCard from './components/AdmitCard';
import Profile from './components/Profile';
import Marksheet from './components/Marksheet';
import GradeSheet from './components/GradeSheet';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      console.log('User already logged in from localStorage:', userData);
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData, token) => {
    console.log('Login successful:', userData);
    console.log('Token received:', token);
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('Authentication state updated, user should be redirected');
  };

  const handleLogout = () => {
    console.log('Logging out user');
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  console.log('Current auth state:', { isAuthenticated, user });

  return (
    <Router>
      <div className="App">
        {isAuthenticated && (
          <header className="app-header">
            <div className="header-content">
              <h1>Nimapara Autonomous College</h1>
              <div className="user-info">
                <span className="user-name">Welcome, {user?.name || user?.['Name of the Students'] || user?.autonomousRollNo}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            </div>
          </header>
        )}

        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? 
                <Dashboard user={user} /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/profile" 
              element={
                isAuthenticated ? 
                <Profile user={user} /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/admit-card" 
              element={
                isAuthenticated ? 
                <AdmitCard user={user} onReturnToLogin={() => window.location.href = '/dashboard'} /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/marksheet" 
              element={
                isAuthenticated ? 
                <Marksheet user={user} /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/grade-sheet" 
              element={
                isAuthenticated ? 
                <GradeSheet user={user} /> : 
                <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
