// AA/controller adapter to the unchanged frozen Z synthetic factory.
import assert from 'node:assert/strict';
import {prepareInteractiveFixtures} from './interactive-wave-fixtures.mjs';
export function prepareProjectFixtures(ctx){assert.equal(ctx.task.id,'WATER-W1-AA');return prepareInteractiveFixtures({...ctx,task:{...ctx.task,id:'WATER-W1-Z'}});}
