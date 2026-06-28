export interface Logger {
  error(message: string, error?: Error): void;
  warn(message: string, error?: Error): void;
  info(message: string): void;
  success(message: string): void;
}

export const logger: Logger = {
  error(message, error) {
    console.error(`❌  ${message}`);
    if (error) console.error(error.stack || error.message);
  },
  warn(message, error) {
    console.warn(`⚠️  ${message}`);
    if (error) console.warn(error.stack || error.message);
  },
  info(message) {
    console.log(message);
  },
  success(message) {
    console.log(`✔️ ${message}`);
  },
};
