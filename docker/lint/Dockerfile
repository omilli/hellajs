FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

CMD ["bun", "lint"]