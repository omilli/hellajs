FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY lib/ lib/
COPY tests/ tests/
COPY biome.json tsconfig.json ./
COPY test-dom.ts ./

CMD ["bun", "run", "test", "--coverage"]