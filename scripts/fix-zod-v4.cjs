#!/usr/bin/env node
// Post-processes Orval-generated Zod schemas to replace Zod v4-only methods
// with Zod v3 equivalents (the workspace catalog pins zod@^3.25.76).
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../lib/api-zod/src/generated/api.ts');

if (!fs.existsSync(target)) {
  console.error('fix-zod-v4: file not found:', target);
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');

// zod.int() → zod.number().int()
src = src.replace(/zod\.int\(\)/g, 'zod.number().int()');

// zod.looseObject({ → zod.object({  (Zod v3 object() is loose by default)
src = src.replace(/zod\.looseObject\(/g, 'zod.object(');

// zod.strictObject({ → zod.object({  (close enough for response validation)
src = src.replace(/zod\.strictObject\(/g, 'zod.object(');

// zod.uuid() → zod.string().uuid()
src = src.replace(/zod\.uuid\(\)/g, 'zod.string().uuid()');

// zod.email() → zod.string().email()
src = src.replace(/zod\.email\(\)/g, 'zod.string().email()');

// zod.url() → zod.string().url()
src = src.replace(/zod\.url\(\)/g, 'zod.string().url()');

fs.writeFileSync(target, src, 'utf8');
console.log('fix-zod-v4: patched', target);
