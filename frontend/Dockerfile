FROM node:22-alpine AS builder

WORKDIR /build_frontend

COPY package.json ./
COPY package-lock.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/

COPY frontend/package.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.node.json ./frontend/
COPY frontend/vite.config.ts ./frontend/

RUN npm --workspace=frontend ci

# Copy code
COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
COPY shared/src ./shared/src
COPY buildInfo.ts ./shared/src/buildInfo.ts
COPY frontend/index.html ./frontend/

RUN npm --workspace=frontend run build

### the app image
FROM nginx:1.25.2-alpine

# WORKDIR /frontend
RUN mkdir /usr/share/nginx/html/dist
COPY --from=builder /build_frontend/frontend/dist /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
