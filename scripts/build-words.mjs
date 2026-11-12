// Generates src/games/wordle/valid.json — every 5-letter a–z word from the
// MIT-licensed `an-array-of-english-words` list. Run with `npm run words`.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const words = require('an-array-of-english-words');
const five = Array.from(new Set(words.filter((w) => /^[a-z]{5}$/.test(w)))).sort();
const out = new URL('../src/games/wordle/valid.json', import.meta.url);
writeFileSync(out, JSON.stringify(five));
console.log(`wrote ${five.length} five-letter words`);
void readFileSync;
