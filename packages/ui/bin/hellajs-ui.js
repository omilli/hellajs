#!/usr/bin/env bun
import { main } from "../dist/index.js";
process.exit(await main(process.argv.slice(2)));
