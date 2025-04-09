FROM oven/bun:latest
WORKDIR /app
EXPOSE 5173

COPY . .

RUN bun install

ENV PATH="/app/node_modules/.bin:${PATH}"

CMD ["bun", "dev", "--host", "0.0.0.0"]