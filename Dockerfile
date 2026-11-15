# syntax=docker/dockerfile:1

# Stage 1: Builder
FROM golang:1.27-alpine AS builder

WORKDIR /build

ARG SERVICE=server

# Install security certificates & build dependencies
RUN apk add --no-cache ca-certificates git

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary without debug bloat
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /bin/service \
    ./cmd/${SERVICE}

# Stage 2: Minimal Runtime
FROM alpine:3.20

# Run as non-root user for security (NFR-Sec-1)
RUN adduser -D -u 10001 -g appuser appuser && \
    apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /bin/service /app/service

USER appuser:appuser
EXPOSE 8080

ENTRYPOINT ["/app/service"]
