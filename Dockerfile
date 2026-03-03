FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY triply/package.json triply/package-lock.json ./triply/
RUN cd triply && npm install --include=dev

COPY triply/ ./triply/
RUN cd triply && npx ng build --configuration production

# Install backend dependencies and build
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
RUN npm run build
RUN test -f dist/main.js && echo "BUILD OK: dist/main.js exists" || (echo "BUILD FAILED: dist/main.js missing" && ls -laR dist/ && exit 1)

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "echo \"DB_URL_SET=${DATABASE_URL:+yes}\" && echo \"DB_URL_START=$(echo $DATABASE_URL | cut -c1-25)\" && cd backend && npx prisma migrate deploy && node dist/main"]
