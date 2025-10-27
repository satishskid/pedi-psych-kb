#!/bin/bash

# Start all services in development mode

echo "🚀 Starting development servers..."

# Start kb-api
echo "Starting kb-api..."
cd apps/kb-api && npm run dev &
KB_PID=$!

# Start app-api
echo "Starting app-api..."
cd ../app-api && npm run dev &
APP_PID=$!

# Start ops-api
echo "Starting ops-api..."
cd ../ops-api && npm run dev &
OPS_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "All services started!"
echo "  • kb-api: http://localhost:8787"
echo "  • app-api: http://localhost:8788"
echo "  • ops-api: http://localhost:8789"
echo "  • Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $KB_PID $APP_PID $OPS_PID $FRONTEND_PID; exit" INT
wait