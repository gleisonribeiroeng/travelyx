FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npx ng build --configuration production

# Install backend dependencies and build
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/
RUN cd backend && npx prisma generate
RUN cd backend && npx tsc -p tsconfig.build.json 2>&1 || true
RUN echo "=== Backend dir ===" && ls -la backend/ && echo "=== Dist dir ===" && ls -laR backend/dist/ 2>/dev/null || echo "dist/ NOT FOUND" && echo "=== Find main ===" && find backend/ -name "main.*" -type f 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:./dev.db"

EXPOSE 3000

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/main"]
