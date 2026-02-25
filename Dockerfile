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

ENV DATABASE_URL="file:./dev.db"

WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js && echo "BUILD OK: dist/main.js exists" || (echo "BUILD FAILED: dist/main.js missing" && ls -laR dist/ && exit 1)

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/main"]
