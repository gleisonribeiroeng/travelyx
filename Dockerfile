FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install --include=dev

COPY frontend/ ./frontend/
RUN cd frontend && npx ng build --configuration production && \
    test -f dist/triply/browser/index.html && echo "FRONTEND BUILD OK" || \
    (echo "FRONTEND BUILD FAILED" && ls -laR dist/ && exit 1)

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

CMD ["sh", "-c", "cd backend && npx prisma db execute --file prisma/fix-migration.sql --schema prisma/schema.prisma 2>/dev/null; npx prisma migrate deploy; node dist/main"]
