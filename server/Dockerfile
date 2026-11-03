# AttendX API
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget curl

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=8 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
