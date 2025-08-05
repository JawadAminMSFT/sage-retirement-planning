#!/bin/bash

echo
echo "========================================"
echo " Sage Retirement Planning - Quick Start"
echo "========================================"
echo

echo "[1/4] Installing frontend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install frontend dependencies"
    exit 1
fi

echo
echo "[2/4] Setting up Python backend with uv..."
cd backend

echo "Checking if uv is available..."
if ! command -v uv &> /dev/null; then
    echo "ERROR: uv is not installed or not in PATH"
    echo "Install uv: https://docs.astral.sh/uv/getting-started/installation/"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "Installing Python dependencies with uv..."
uv sync
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies"
    exit 1
fi

cd ..

echo
echo "[3/4] Setting up environment files..."
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
    cp ".env.example" ".env.local"
    echo "Created .env.local from template"
fi

if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    cp "backend/.env.example" "backend/.env"
    echo "Created backend/.env from template"
    echo
    echo "IMPORTANT: Please edit backend/.env with your Azure credentials before running in live mode"
fi

echo
echo "[4/4] Setup complete!"
echo
echo "To start the application:"
echo "  Frontend only: npm run dev          (http://localhost:3847)"
echo "  Backend only:  npm run backend:dev  (http://localhost:8172)"
echo "  Both together: npm run dev:full"
echo
echo "Run backend tests: npm run backend:test"
echo
