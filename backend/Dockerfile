FROM node:18-alpine

# Install backend dependencies
COPY ./backend/package.json ./backend/
COPY ./backend/package-lock.json ./backend/
RUN cd backend && npm ci && cd ..

# Install shared dependencies
COPY shared/package.json ./shared/
COPY shared/package-lock.json ./shared/
COPY shared/tsconfig.json ./shared/
RUN cd shared && npm ci && cd ..

COPY ./backend/tsconfig.json ./backend/
COPY ./backend/src ./backend/src
COPY ./shared/src ./shared/src
COPY buildInfo.ts ./shared/src/buildInfo.ts

EXPOSE 3000
CMD cd backend && npm run start
