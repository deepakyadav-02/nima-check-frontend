// Auth utility functions
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Basic JWT structure check (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to decode the payload (without verification)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        console.log('Token expired:', {
          expired: new Date(payload.exp * 1000),
          now: new Date()
        });
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error validating token:', err);
    return false;
  }
};

export const getTokenData = (token) => {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (err) {
    console.error('Error decoding token:', err);
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

