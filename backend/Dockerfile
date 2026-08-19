FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/api/main.go

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/server .
COPY --from=builder /app/go.mod .
COPY --from=builder /app/go.sum .
COPY --from=builder /app/.env.example ./.env

EXPOSE 8080

CMD ["./server"]
