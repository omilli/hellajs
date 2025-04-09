FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

# We don't copy the project files here since we'll use a volume mount
# to ensure changes made in the container affect the host files

CMD ["bun", "lint"]