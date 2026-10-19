// V-only adapter: same bounded frozen factory, unchanged root and local paths.
import assert from 'node:assert/strict';
import {prepareNativeWalkFixtures} from './prepare-native-walk-fixtures.mjs';
export function prepareNativeSessionFixtures(ctx){assert.equal(ctx.task.id,'WATER-W1-V');return prepareNativeWalkFixtures({...ctx,task:{...ctx.task,id:'WATER-W1-R'}});}
