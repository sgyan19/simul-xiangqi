# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建前端和后端
RUN pnpm vite build
RUN pnpm tsup server/server.ts --format cjs --platform node --target node20 --outDir dist-server --no-splitting --no-minify --external vite --external express --external ws --external '*.css' --external '*.svg' --external '*.png' --external '*.jpg'

# 运行阶段
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/public ./public

# 复制 package.json 用于安装生产依赖
COPY --from=builder /app/package.json ./

# 安装依赖（包含 devDependencies 中的 vite）
RUN pnpm install

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5000

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["sh", "-c", "PORT=5000 node dist-server/server.js"]
