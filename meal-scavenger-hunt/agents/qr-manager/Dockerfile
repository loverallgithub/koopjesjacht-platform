FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 9001

CMD ["node", "index.js"]
