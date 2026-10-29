const { test } = require('node:test');
const assert = require('node:assert/strict');
const { historySummary } = require('../src/historySummary.ts');
const counts = (entity_id, on_count, off_count, hour) => ({
 entity_id, on_count, off_count, total: on_count + off_count, peak_hour: hour,
 hourly: Array.from({length:24}, (_, h) => h === hour ? on_count : 0),
});
test('living room retains old history when Auto switches to real events', () => {
 const old = counts('living',30,30,18); old.hourly[18]=21; old.hourly[19]=9;
 const actual = counts('living',3,1,6);
 const [merged] = historySummary([actual],[old],true);
 assert.equal(merged.on_count,33); assert.equal(merged.off_count,31);
 assert.equal(merged.total,64); assert.equal(merged.peak_hour,18);
 assert.equal(Math.round(merged.hourly[18]/merged.on_count*100),64);
 assert.equal(old.on_count,30);
 assert.deepEqual(historySummary([actual],[old],true),[merged]);
});
test('other devices keep their history and disabled starting profiles stay excluded', () => {
 const bedroom=counts('bedroom',28,28,20), living=counts('living',3,1,6);
 assert.deepEqual(historySummary([living],[bedroom],true),[bedroom,living]);
 assert.deepEqual(historySummary([living],[bedroom],false),[living]);
});
