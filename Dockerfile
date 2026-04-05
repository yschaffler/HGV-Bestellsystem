# Stage 1: Build Next.js Frontend
FROM node:20-alpine AS builder-frontend

WORKDIR /app/frontend
# Copy package files first to cache dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy all frontend source files
COPY frontend/ ./
# Build the static export
RUN npx @tailwindcss/postcss@4 || true 
RUN npm run build

# Stage 2: Build Go Backend
FROM golang:alpine AS builder-backend

WORKDIR /app/backend
# Copy go.mod and go.sum files
COPY backend/go.* ./
RUN go mod download

# Copy the backend source files
COPY backend/ ./
# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Stage 3: Final Production Image
FROM alpine:latest

WORKDIR /app

# Copy Go binary
COPY --from=builder-backend /app/backend/server .

# Copy Next.js static output to public directory
COPY --from=builder-frontend /app/frontend/out ./public

# Expose port (Backend runs on 8000)
EXPOSE 8000

# Start server
CMD ["./server"]
