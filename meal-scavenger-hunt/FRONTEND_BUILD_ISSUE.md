# Frontend Docker Build Issue - ajv Dependency Conflict

**Date:** October 18, 2025
**Issue:** React build fails in Docker due to ajv version conflict
**Status:** WORKAROUND DOCUMENTED

---

## Problem Description

The React frontend build fails in Docker with the following error:

```
TypeError: Cannot read properties of undefined (reading 'date')
    at extendFormats (/app/node_modules/fork-ts-checker-webpack-plugin/node_modules/ajv-keywords/keywords/_formatLimit.js:63:25)
```

### Root Cause

The issue stems from a dependency conflict in `react-scripts` 5.0.1:

1. **react-scripts** uses **fork-ts-checker-webpack-plugin** for TypeScript checking
2. **fork-ts-checker-webpack-plugin** depends on **schema-utils**
3. **schema-utils** depends on **ajv-keywords**
4. **ajv-keywords** has a nested dependency on **ajv** v6.x
5. However, our app and other dependencies expect **ajv** v8.x

This creates an incompatible dependency tree where `ajv-keywords` can't find the expected `ajv` v6 API, causing the build to crash.

---

## Attempted Solutions (All Failed)

### 1. npm overrides ❌
```json
"overrides": {
  "ajv": "^8.12.0"
}
```
**Result:** npm overrides don't apply to nested dependencies in fork-ts-checker-webpack-plugin

### 2. CRACO configuration ❌
Created `craco.config.js` to:
- Disable TypeScript checking
- Remove ForkTsCheckerWebpackPlugin
- Force ajv alias

**Result:** Plugin still loads before craco can modify webpack config

### 3. Environment variables ❌
```dockerfile
ENV TSC_COMPILE_ON_ERROR=true
ENV DISABLE_ESLINT_PLUGIN=true
```
**Result:** fork-ts-checker-webpack-plugin still initializes and crashes

### 4. Manual ajv installation ❌
```dockerfile
RUN npm install ajv@^8.12.0 --legacy-peer-deps --save-exact
```
**Result:** Nested dependencies in fork-ts-checker-webpack-plugin remain unchanged

---

## Current Workaround

### Option 1: Static HTML Placeholder (Current)

**Implementation:**
```yaml
# docker-compose.yml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.static  # Uses simple static HTML
```

**Pros:**
- Works immediately
- Docker deployment successful
- Backend and all agents running

**Cons:**
- No React app functionality
- Only serves placeholder page
- Cannot test real frontend features

---

## Recommended Solutions

### Solution 1: Build Locally, Copy Artifacts (RECOMMENDED)

Build the React app on your local machine (where dependencies resolve correctly), then copy the build artifacts to Docker.

**Steps:**

1. **Build locally:**
```bash
cd frontend
npm install
npm run build
```

2. **Create simplified Dockerfile:**
```dockerfile
# frontend/Dockerfile.prebuilt
FROM nginx:alpine

COPY build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

3. **Update docker-compose.yml:**
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.prebuilt
```

4. **Rebuild:**
```bash
docker-compose up -d --build frontend
```

**Pros:**
- Uses full React app
- Avoids Docker build issues
- Fast rebuilds

**Cons:**
- Manual build step required
- Build artifacts in git (unless .gitignored)

---

### Solution 2: Use Vite Instead of Create React App

Migrate from Create React App (react-scripts) to Vite, which doesn't have this dependency issue.

**Steps:**

1. **Install Vite:**
```bash
npm install vite @vitejs/plugin-react --save-dev
```

2. **Create vite.config.js:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'build'
  }
})
```

3. **Update package.json:**
```json
"scripts": {
  "start": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

4. **Move index.html to root** and update paths

5. **Update Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Pros:**
- Modern build tool
- Faster builds
- No ajv conflicts
- Better DX

**Cons:**
- Migration effort required
- Potential breaking changes

---

### Solution 3: Upgrade react-scripts

Upgrade to react-scripts 5.0.2 or later (if available) which may have fixed dependencies.

**Steps:**
```bash
npm install react-scripts@latest
```

**Status:** react-scripts 5.0.1 is the latest CRA version (as of early 2025). CRA is in maintenance mode, so this may not resolve the issue.

---

### Solution 4: Use Yarn Instead of npm

Yarn's resolutions field actually works for nested dependencies.

**Steps:**

1. **Add yarn.lock:**
```bash
yarn import  # Convert package-lock.json to yarn.lock
```

2. **Add resolutions to package.json:**
```json
"resolutions": {
  "fork-ts-checker-webpack-plugin/**/ajv": "^8.12.0",
  "**/**/ajv-keywords": "^5.1.0"
}
```

3. **Update Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
```

**Pros:**
- Uses existing React setup
- Proper resolution handling

**Cons:**
- Adds Yarn to project
- May not fully resolve nested conflicts

---

## Testing Frontend Without Docker

While the Docker build is being resolved, you can test the frontend locally:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (runs on http://localhost:3000)
npm start

# Build for production
npm run build

# Serve built app locally
npx serve -s build -l 8081
```

The frontend will connect to:
- **API Gateway:** http://localhost:9000 (from Docker)
- **Backend:** http://localhost:3527 (from Docker)

---

## Current Platform Status

✅ **Working:**
- All 22 Docker containers running
- 19 agents healthy and operational
- PostgreSQL and Redis running
- Backend API operational (port 3527)
- API Gateway operational (port 9000)

⚠️ **Issue:**
- Frontend React build fails in Docker
- Currently serving static placeholder

📊 **Impact:**
- Cannot test full user interface
- Cannot test React pages created
- API endpoints can be tested via Postman/curl
- Backend functionality fully testable

---

## Immediate Next Steps

### For Development/Testing:
1. Run frontend locally: `cd frontend && npm start`
2. Test pages at http://localhost:3000
3. Backend/agents accessible from local React app

### For Docker Deployment:
1. **RECOMMENDED:** Build locally and use Dockerfile.prebuilt (Solution 1)
2. **ALTERNATIVE:** Migrate to Vite (Solution 2)
3. **QUICK FIX:** Keep static placeholder, test APIs directly

---

## Files Created/Modified

### Configuration Files:
- `frontend/craco.config.js` - CRACO webpack override config (didn't solve issue)
- `frontend/package.json` - Added @craco/craco, overrides field
- `frontend/Dockerfile` - Updated with various attempted fixes
- `docker-compose.yml` - Switched back to Dockerfile.static

### Build Artifacts Status:
- `frontend/build/` - Not yet created (build fails in Docker)
- `frontend/public/static-index.html` - Static placeholder (currently served)

---

## References

- **Issue Tracker:** https://github.com/facebook/create-react-app/issues (similar ajv conflicts reported)
- **Vite Migration Guide:** https://vitejs.dev/guide/migration-from-cra.html
- **CRACO Docs:** https://craco.js.org/
- **Yarn Resolutions:** https://classic.yarnpkg.com/en/docs/selective-version-resolutions/

---

## Summary

**Problem:** react-scripts 5.0.1 has incompatible nested ajv dependencies that cause Docker builds to fail

**Workaround:** Currently using static HTML placeholder in Docker

**Recommended Fix:** Build React app locally, copy artifacts to Docker (Solution 1)

**Long-term Fix:** Migrate to Vite for modern, faster builds without dependency conflicts (Solution 2)

**Testing:** Run `npm start` locally in `frontend/` directory to test all new React pages

---

**Last Updated:** October 18, 2025
**Next Action:** Implement Solution 1 (local build + Docker copy) for full deployment
