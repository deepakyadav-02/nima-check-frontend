#!/bin/bash

echo "Starting Student Management Frontend..."
echo "======================================"
echo ""
echo "Make sure your backend server is running on http://localhost:5000"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting development server..."
echo "Frontend will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
