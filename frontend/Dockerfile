# AttendX Frontend — multi-stage
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
RUN apk add --no-cache wget
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Tiny boot message so compose shows frontend is up
COPY docker-frontend-start.sh /docker-frontend-start.sh
RUN chmod +x /docker-frontend-start.sh
EXPOSE 80
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["/docker-frontend-start.sh"]
