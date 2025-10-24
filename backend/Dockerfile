# 使用 Alpine 版本（更小，下载更快）
FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 使用淘宝镜像加速（可选）
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm install

# 复制所有代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 生产模式启动
CMD ["npm", "run", "start"]