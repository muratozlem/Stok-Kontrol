#!/bin/bash
set -e

echo "Installing dashboard dependencies..."
cd dashboard && bun install --frozen-lockfile 2>/dev/null || bun install
cd ..

echo "Post-merge setup complete."
