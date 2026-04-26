#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Running database migrations..."
alembic upgrade head

echo "Build complete."
