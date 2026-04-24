#!/bin/bash
set -e

# Change to the directory where the script is located
cd "$(dirname "$0")"

echo "Setting up SQLite Viewer..."

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed or not in PATH."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt --quiet

# Start the application
echo "Starting FastAPI server on http://localhost:8090"
uvicorn app.main:app --host 127.0.0.1 --port 8090
