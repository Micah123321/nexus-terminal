const assert = require('assert');
let queue = Promise.resolve();
let active = 0;
let overlap = 0;
const tx = async (work) => {
  const run = queue.then(async () => {
    active += 1;
    if (active > 1) overlap += 1;
    try {
      return await work();
    } finally {
      active -= 1;
    }
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
};
(async () => {
  const results = await Promise.all([
    tx(async () => { await new Promise((r) => setTimeout(r, 30)); return 'a'; }),
    tx(async () => { await new Promise((r) => setTimeout(r, 10)); return 'b'; }),
    tx(async () => { throw new Error('boom'); }),
    tx(async () => 'd'),
  ].map((p) => p.catch((e) => `err:${e.message}`)));
  assert.deepStrictEqual(results, ['a', 'b', 'err:boom', 'd']);
  assert.strictEqual(overlap, 0, 'transactions must not overlap');
  const after = await tx(async () => 'still-works');
  assert.strictEqual(after, 'still-works', 'queue must continue after failure');
  console.log('transaction helper semantics OK');
})();