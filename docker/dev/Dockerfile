FROM oven/bun:latest
WORKDIR /app
EXPOSE 5173

COPY package.json bun.lockb* ./
RUN bun install

CMD [ "bun", "run", "dev", "--host", "0.0.0.0" ]