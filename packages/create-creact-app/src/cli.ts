#!/usr/bin/env node
// Thin bin entry: runs the scaffolder unconditionally, the way create-vite,
// create-next-app, and create-astro do. No "is this the main module?" guard —
// that check breaks when npm invokes the bin through its symlink, and it is
// unnecessary because the testable logic lives in ./index.ts, which tests
// import directly and which never self-executes.
import { main } from "./index.js";

await main();
