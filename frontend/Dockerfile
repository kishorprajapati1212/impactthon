# AttendX Frontend - multi-stage
FROM node:20-alpine AS builder
WORKDIR /app
# Empty = same-origin mode: the browser calls /api/* on this nginx, which
# proxies to the API container (see nginx.conf). Set only for a remote API.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
# npm ci (exact lockfile versions) + npm cache removed in the same layer, so the
# build cache stays small on machines with little disk space.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
    else npm install --no-audit --no-fund; fi \
    && npm cache clean --force
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
