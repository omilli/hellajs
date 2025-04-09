FROM oven/bun@sha256:06a0368487af1fa8c6309715b30b55160a1fb9057005ede54883f016ba9ff142
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY lib/ lib/
COPY tests/ tests/
COPY biome.json tsconfig.json ./

CMD ["bun", "test", "--coverage"]