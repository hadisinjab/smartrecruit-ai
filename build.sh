# Build script for Render deployment
#!/bin/bash
set -e

echo "🔧 Starting build process..."

# Build AI Server
echo "📦 Building AI Server..."
cd ai-server
pip install -r requirements.txt
cd ..

# Build Backend
echo "📦 Building Backend..."
cd backend
npm install
cd ..

# Build Frontend
echo "📦 Building Frontend..."
npm install
npm run build

echo "✅ Build completed successfully!"