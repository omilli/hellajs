#!/usr/bin/env node
import { main } from "../dist/index.js";
process.exit(await main(process.argv.slice(2)));
