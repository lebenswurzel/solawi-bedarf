FROM node:18-alpine as builder

WORKDIR /build_frontend

COPY frontend/package.json ./frontend/
COPY frontend/package-lock.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.node.json ./frontend/
COPY frontend/vite.config.ts ./frontend/

RUN cd frontend && npm ci && cd ..

COPY frontend/public ./frontend/public
COPY frontend/src ./frontend/src
COPY shared/src ./shared/src
COPY frontend/index.html ./frontend/

RUN cd frontend && npm run build && cd ..

### the app image
FROM nginx:1.25.2-alpine

# WORKDIR /frontend
RUN mkdir /usr/share/nginx/html/dist
COPY --from=builder /build_frontend/frontend/dist /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

