FROM golang:1.26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -ldflags="-w -s" -o /orange-api ./cmd/server

FROM alpine:3.22

RUN apk --no-cache add ca-certificates tzdata wget && adduser -D -H orange

ENV API_SERVER_HOST=0.0.0.0
ENV API_SERVER_PORT=3456
ENV RUNTIME_MODE=server
ENV TZ=Asia/Shanghai

WORKDIR /app

COPY --from=builder /orange-api /usr/local/bin/orange-api

USER orange

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3456/api/health || exit 1

CMD ["orange-api"]
