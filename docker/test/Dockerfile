FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

ENV PATH="/app/node_modules/.bin:${PATH}"

COPY lib/ lib/
COPY tests/ tests/
COPY biome.json tsconfig.json ./
COPY test-dom.ts ./


CMD ["bun", "run", "test", "--coverage"]