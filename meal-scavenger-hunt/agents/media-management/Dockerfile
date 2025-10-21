FROM node:18-alpine

# Install dependencies for sharp
RUN apk add --no-cache \
    vips-dev \
    fftw-dev \
    build-base \
    python3 \
    wget

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

EXPOSE 9006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9006/health || exit 1

CMD ["node", "index.js"]
