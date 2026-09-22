# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Unprivileged nginx: listens on 8080, runs as uid 101, no root needed.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="my-path-web"
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://api:8000
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD ["wget", "-qO-", "http://127.0.0.1:8080/nginx-health"]
