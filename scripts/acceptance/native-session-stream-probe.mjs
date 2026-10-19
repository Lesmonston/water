// Controller retained-capture transport probe; not a V replacement.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=Number(process.argv[2]);assert(Number.isInteger(index)&&index>=0&&index<8);assert.equal(process.argv.length,3);const cases=JSON.parse(readFileSync('contracts/native-session-v1/cases.json','utf8'));process.stdout.write(JSON.stringify(cases.cases[index].bundle)+'\n');
