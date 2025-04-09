FROM oven/bun@sha256:06a0368487af1fa8c6309715b30b55160a1fb9057005ede54883f016ba9ff142
WORKDIR /app
EXPOSE 5173

COPY package.json bun.lockb* ./
RUN bun install

CMD [ "bun", "run", "dev", "--host", "0.0.0.0" ]