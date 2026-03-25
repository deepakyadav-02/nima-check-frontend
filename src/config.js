
const config = {
  // For local testing, change this to: 'http://localhost:5000/api'
  // For production, use: 'https://nima-check.vercel.app/api'
  API_BASE_URL:
    import.meta?.env?.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5001/api'
      : 'https://nima-check.vercel.app/api'),

  API_ENDPOINTS: {
    LOGIN: '/auth/login',
    ADMIT_CARD: '/students/admit-card',
    PROFILE: '/students/profile',
    SEARCH: '/students/search',
    MARKSHEET: '/marksheet',
    UPLOAD_IMAGE: '/students/upload-image',
    DELETE_IMAGE: '/students/delete-image'
  }
};

export default config;
