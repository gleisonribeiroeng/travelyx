FROM node:20-alpine

WORKDIR /app

# Railway passes service variables as build args
ARG DATABASE_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG GOOGLE_CALLBACK_URL
ARG FRONTEND_URL
ARG JWT_SECRET
ARG MOCK_MODE

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
RUN DATABASE_URL="${DATABASE_URL:-postgresql://build:build@localhost:5432/build}" npx prisma generate
RUN npm run build
RUN test -f dist/main.js && echo "BUILD OK: dist/main.js exists" || (echo "BUILD FAILED: dist/main.js missing" && ls -laR dist/ && exit 1)

WORKDIR /app

# Persist build args as runtime env vars (Railway injects at runtime too,
# but this ensures they're available even if injection fails)
ENV DATABASE_URL=${DATABASE_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL}
ENV FRONTEND_URL=${FRONTEND_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV MOCK_MODE=${MOCK_MODE}
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/main"]
