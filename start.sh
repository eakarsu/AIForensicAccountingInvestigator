#!/bin/bash

# AI Forensic Accounting Investigator - Start Script
# This script sets up and starts the full application

set -e

echo "=============================================="
echo "  AI Forensic Accounting Investigator"
echo "  Starting Application..."
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ==========================================
# Clean up used ports
# ==========================================
echo -e "\n${YELLOW}[1/6] Cleaning up ports...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo -e "  ${GREEN}Ports $BACKEND_PORT and $FRONTEND_PORT are free${NC}"

# ==========================================
# Check PostgreSQL
# ==========================================
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "  ${RED}PostgreSQL is not installed. Please install it first.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "  ${RED}Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 2
fi

echo -e "  ${GREEN}PostgreSQL is running${NC}"

# Create database if not exists
DB_NAME=${DB_NAME:-forensic_accounting}
DB_USER=${DB_USER:-postgres}

if ! psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "  Creating database '$DB_NAME'..."
  createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
    # Try with current user if postgres user doesn't work
    DB_USER=$(whoami)
    createdb "$DB_NAME" 2>/dev/null || psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
  }
fi

echo -e "  ${GREEN}Database '$DB_NAME' ready${NC}"

# ==========================================
# Install Backend Dependencies
# ==========================================
echo -e "\n${YELLOW}[3/6] Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"

if [ ! -d "node_modules" ]; then
  npm install
else
  echo -e "  ${GREEN}Dependencies already installed${NC}"
fi

# ==========================================
# Seed Database
# ==========================================
echo -e "\n${YELLOW}[4/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend"

# Try with configured DB_USER, fall back to current user
node src/seed.js 2>/dev/null || {
  echo -e "  ${YELLOW}Retrying with current user...${NC}"
  DB_USER=$(whoami) node src/seed.js
}

echo -e "  ${GREEN}Database seeded successfully${NC}"

# ==========================================
# Install Frontend Dependencies
# ==========================================
echo -e "\n${YELLOW}[5/6] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  npm install
else
  echo -e "  ${GREEN}Dependencies already installed${NC}"
fi

# ==========================================
# Start Application
# ==========================================
echo -e "\n${YELLOW}[6/6] Starting application...${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reload
echo -e "  ${BLUE}Starting backend on port $BACKEND_PORT (with hot reload)...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "  Waiting for backend..."
for i in {1..30}; do
  if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    echo -e "  ${GREEN}Backend is ready!${NC}"
    break
  fi
  sleep 1
done

# Start frontend with hot reload (default with react-scripts)
echo -e "  ${BLUE}Starting frontend on port $FRONTEND_PORT (with hot reload)...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

sleep 3

echo ""
echo "=============================================="
echo -e "  ${GREEN}Application is running!${NC}"
echo ""
echo -e "  Frontend: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "  Login: admin@forensic.com / password123"
echo ""
echo "  Press Ctrl+C to stop"
echo "=============================================="

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
