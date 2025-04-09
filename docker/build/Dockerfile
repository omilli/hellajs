FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
RUN bun vite build

CMD ["echo", "Build completed!"]