# Fanvue.com QA Automation Suite

## Overview
This repository demonstrates a comprehensive QA automation approach for Fanvue.com, integrating multiple testing tools and CI/CD pipelines.

## Architecture

### Testing Stack
- **Playwright**: E2E browser automation
- **k6**: Load and performance testing
- **TestRail**: Test case management
- **Sentry**: Error tracking and monitoring
- **GitHub Actions**: CI/CD pipeline

### MCP Integration
The suite leverages Model Context Protocol (MCP) servers for:
- Browser automation (Playwright MCP)
- Performance testing (k6 MCP)
- Test management (TestRail MCP)
- Error tracking (Sentry MCP)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/johnautomates117/fanvue-qa-automation.git
cd fanvue-qa-automation

# Install dependencies
npm install

# Run tests
npm test
```

For detailed documentation, see the full README in the repository.