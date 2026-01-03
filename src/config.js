
const config = {
  // For local testing, change this to: 'http://localhost:5000/api'
  // For production, use: 'https://nima-check.vercel.app/api'
  API_BASE_URL: 'http://localhost:5001/api',

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
