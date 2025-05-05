FROM node:22-alpine

ARG SOLAWI_BEDARF_HOME=/opt/solawi-bedarf

RUN mkdir "$SOLAWI_BEDARF_HOME"
WORKDIR "$SOLAWI_BEDARF_HOME"

# Install backend dependencies
COPY package.json ./
COPY package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm --workspace=backend ci

COPY shared/tsconfig.json shared/
COPY backend/tsconfig.json backend/
COPY backend/src backend/src
COPY shared/src shared/src
COPY buildInfo.ts shared/src/buildInfo.ts

EXPOSE 3000
WORKDIR "$SOLAWI_BEDARF_HOME/backend"
CMD npm run start
