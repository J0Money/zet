import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastEquipmentByChoice } from '../lib/exercise-groups';
import type { Exercise, Entry } from '../lib/types';
test('Seneste registrering bestemmer udstyr pr. øvelse, også i samme pas', () => {
 const exercises = [
  {id:'neutral',name:'Row',group_name:null,equipment:null,type:'strength'},
  {id:'machine',name:'Row (Maskine)',group_name:'Row',equipment:'machine',type:'strength'},
  {id:'cable',name:'Row (Kabel)',group_name:'Row',equipment:'cable',type:'strength'},
  {id:'squat',name:'Squat',group_name:null,equipment:'barbell',type:'strength'},
 ] as Exercise[];
 const entry = (id:string) => ({kind:'strength',exercise_id:id}) as Entry;
 assert.deepEqual(lastEquipmentByChoice(exercises,[entry('neutral'),entry('machine'),entry('squat'),entry('cable'),entry('missing')]), {'group:Row':'cable','group:Squat':'barbell'});
 assert.deepEqual(lastEquipmentByChoice(exercises,[entry('machine'),entry('neutral')]), {'group:Row':'none'});
 assert.deepEqual(lastEquipmentByChoice(exercises,[]), {});
});
