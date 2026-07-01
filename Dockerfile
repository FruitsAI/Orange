# Orange 项目 Dockerfile
# 多阶段构建，优化镜像大小

# ============================================
# 第一阶段：构建前端资源
# ============================================
FROM node:24.15.0-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================
# 第二阶段：构建 Go 后端
# ============================================
FROM golang:1.26-alpine AS builder

LABEL maintainer="Orange Team <orange@willxue.com>"

# 安装构建依赖
RUN apk add --no-cache git gcc musl-dev

# 设置工作目录
WORKDIR /build

# 复制 go.mod 和 go.sum（利用 Docker 缓存）
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

COPY --from=frontend-builder /frontend/dist ./frontend/dist

# 构建可执行文件
# CGO_ENABLED=0: 禁用 CGO，生成纯静态二进制文件
# -ldflags="-w -s": 去除调试信息，减小文件大小
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o orange .

# ============================================
# 第二阶段：构建前端（可选，如果使用 Wails）
# ============================================
# 如果是 Wails Desktop 应用，前端已嵌入到 Go 二进制中
# 如果是 Web 应用，可以添加前端构建阶段

# ============================================
# 最终阶段：最小化运行镜像
# ============================================
FROM alpine:3.22

LABEL maintainer="Orange Team <orange@willxue.com>"
LABEL version="0.7.2"
LABEL description="Orange Project Management System"

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata wget

# 设置时区（中国标准时间）
ENV TZ=Asia/Shanghai

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1000 -S orange && \
    adduser -u 1000 -S orange -G orange

# 创建必要的目录
RUN mkdir -p /app/data /app/logs && \
    chown -R orange:orange /app

# 设置工作目录
WORKDIR /app

# 从构建阶段复制可执行文件
COPY --from=builder /build/orange .

# 复制默认配置文件（可选）
COPY --from=builder /build/.env.example .env.example

# 复制 docs 目录（如果存在 Swagger 文档）
COPY --from=builder /build/docs docs/

# 切换到非 root 用户
USER orange

# 暴露端口
EXPOSE 3456

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3456/api/health || exit 1

# 启动应用
ENTRYPOINT ["./orange"]

# 默认命令参数
CMD []
