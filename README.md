# Student Management Frontend

A React-based frontend application for the Student Management System that allows students to login and download their admit cards.

## Features

- **Student Login**: Secure authentication using Autonomous Roll No and Date of Birth
- **Admit Card Display**: View admit card with student details and subjects
- **PDF Download**: Download admit card as PDF for printing
- **Responsive Design**: Works on desktop and mobile devices
- **JWT Authentication**: Secure token-based authentication

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (see main project README)

## Installation

1. **Navigate to the client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**
   - The backend URL is configured in `src/config.js`
   - Default: `http://localhost:5000/api`
   - Update this if your backend runs on a different port or host

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

## Usage

### Student Login
1. Enter your Autonomous Roll Number (e.g., NACBBA24-001)
2. Enter your Date of Birth in DD-MM-YYYY format
3. Click "Login" to authenticate

### Viewing Admit Card
1. After successful login, you'll see your student details
2. Click "View Admit Card" to see the full admit card
3. The admit card displays:
   - College header and logo
   - Student personal information
   - Subject details
   - Examination rules
   - Signature sections

### Downloading Admit Card
1. Click "Download as PDF" button
2. The admit card will be converted to PDF and downloaded
3. File will be named: `admit_card_[ROLL_NUMBER].pdf`

## Project Structure

```
src/
├── components/
│   ├── Login.jsx          # Login form component
│   ├── Login.css          # Login component styles
│   ├── AdmitCard.jsx      # Admit card display component
│   └── AdmitCard.css      # Admit card component styles
├── config.js              # API configuration
├── App.jsx                # Main application component
├── App.css                # Main application styles
└── main.jsx               # Application entry point
```

## API Integration

The frontend integrates with the backend API endpoints:

- **POST** `/api/auth/login` - Student authentication
- **GET** `/api/students/admit-card` - Fetch admit card data
- **GET** `/api/students/profile` - Get student profile (future use)
- **GET** `/api/students/search` - Search students (future use)

## Configuration

### Backend URL
Update the backend URL in `src/config.js`:

```javascript
export const API_BASE_URL = 'http://your-backend-url:port/api';
```

### Environment Variables
For production, you can create a `.env.local` file:

```env
VITE_API_BASE_URL=http://your-production-backend-url/api
```

## Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the build**
   ```bash
   npm run preview
   ```

3. **Deploy the `dist` folder** to your web server

## Dependencies

- **React**: UI framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **jsPDF**: PDF generation
- **html2canvas**: HTML to canvas conversion for PDF

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure your backend server is running
   - Check the API URL in `src/config.js`
   - Verify CORS settings on backend

2. **Login Issues**
   - Check if the student exists in the database
   - Verify date format (DD-MM-YYYY)
   - Check browser console for error messages

3. **PDF Download Issues**
   - Ensure all dependencies are installed
   - Check browser console for errors
   - Try refreshing the page

### Development Tips

- Use browser developer tools to debug API calls
- Check the Network tab for API request/response details
- Use the Console tab for error messages and debugging

## Contributing

1. Follow the existing code style
2. Test your changes thoroughly
3. Ensure responsive design works on mobile devices
4. Update documentation as needed

## License

This project is part of the Student Management System.
