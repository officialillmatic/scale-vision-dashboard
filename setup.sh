#!/usr/bin/env bash

# This script automatically installs required dependencies when the Codex
# container starts. It will be executed if placed in the repository root.

# Install Python dependencies if a requirements file exists
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

# Install Node.js dependencies using npm
if [ -f package.json ]; then
  npm install
fi
