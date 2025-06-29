#!/bin/bash

# Script to test visual regression locally before pushing
# This helps debug issues before they fail in CI/CD

echo "🧪 Testing Visual Regression Setup Locally"
echo "========================================"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Install Playwright browsers if not already installed
echo "🌐 Ensuring Playwright browsers are installed..."
npx playwright install chromium firefox webkit

# Create screenshots directory if it doesn't exist
mkdir -p tests/visual/__screenshots__

# Check if baselines exist
if [ -d "tests/visual/__screenshots__" ] && [ "$(ls -A tests/visual/__screenshots__)" ]; then
    echo "✅ Baseline screenshots found"
    echo "Running visual regression tests..."
    npm run test:visual
else
    echo "📸 No baselines found. Creating initial baselines..."
    npm run test:visual:update
    echo "✅ Baselines created! Run this script again to test against them."
fi

# Generate report if tests were run
if [ -d "visual-regression-report" ]; then
    echo "📊 Opening visual regression report..."
    npm run test:visual:report
fi

echo ""
echo "🎯 Tips for debugging failures:"
echo "1. Check visual-regression-report/index.html for detailed diffs"
echo "2. Update baselines after intentional changes: npm run test:visual:update"
echo "3. Ensure the website is accessible and not behind authentication"
echo "4. Check that selectors in tests match the current page structure"
