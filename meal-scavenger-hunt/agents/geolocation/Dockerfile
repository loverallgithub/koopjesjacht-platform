FROM node:18-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 9009

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9009/health || exit 1

CMD ["node", "index.js"]
