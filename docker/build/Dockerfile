FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
RUN bun vite build && \
  chmod -R 777 dist 

CMD ["echo", "Build completed!"]