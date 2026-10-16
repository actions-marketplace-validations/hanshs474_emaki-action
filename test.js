// Offline tests against the response shapes of the live API. Run: node test.js
'use strict';
const assert = require('assert');
const { Emaki, classify, parseSubmit, parseStatus, parseCredits } = require('./client');
const { buildParameters } = require('./index');

assert.strictEqual(parseSubmit(200, { success: true, data: { id: 'v1', status: 'generating' } }), 'v1');
assert.strictEqual(parseCredits(200, { code: 0, data: { remainingCredits: 42, hasPurchasedCredits: false } }), 42);
assert.strictEqual(parseStatus(200, { success: true, data: { id: 'v1', status: 'completed', videoUrl: 'https://x/y.mp4' } }).videoUrl, 'https://x/y.mp4');
const kinds = [[401, {}, 'auth'], [402, { error: 'Insufficient credits' }, 'quota'], [403, {}, 'plan'], [409, {}, 'busy'],
  [429, { code: 'content_cooldown' }, 'rejected'], [400, { code: 'content_blocked' }, 'rejected'], [400, { error: 'bad' }, 'validation'],
  [500, {}, 'api'], [200, { code: -1, message: 'Invalid API key' }, 'auth']];
for (const [s, b, k] of kinds) assert.strictEqual(classify(s, b).kind, k, `${s} ${JSON.stringify(b)}`);
assert.throws(() => parseCredits(200, { code: -1, message: 'Unauthorized' }), (e) => e.kind === 'auth');

const get = (m) => (k) => m[k] || '';
assert.deepStrictEqual(buildParameters('seedance_2_5', get({ 'aspect-ratio': '9:16', duration: '8', resolution: '720p', 'image-url': 'https://a/b.png' })),
  { image: 'https://a/b.png', aspect_ratio: '9:16', duration: 8, resolution: '720p' });
assert.deepStrictEqual(buildParameters('veo_3_1', get({ 'aspect-ratio': '16:9', parameters: '{"generate_audio":false}' })),
  { generate_audio: false, aspectRatio: '16:9' });

(async () => {
  // A full run against a fake fetch: submit, one "generating" poll, then completed.
  const answers = [[200, { success: true, data: { id: 'v9', status: 'generating' } }],
    [200, { success: true, data: { id: 'v9', status: 'generating' } }],
    [200, { success: true, data: { id: 'v9', status: 'completed', videoUrl: 'https://cdn/v9.mp4' } }]];
  const calls = [];
  const fake = async (url, init) => { calls.push([url, JSON.parse(init.body), init.headers.authorization]);
    const [status, body] = answers.shift(); return { status, json: async () => body }; };
  const c = new Emaki({ apiKey: 'sk-test', fetch: fake });
  const id = await c.submit('a fox in snow', 'seedance_2_5', { duration: 5 });
  assert.strictEqual(await c.wait(id, { pollMs: 1 }), 'https://cdn/v9.mp4');
  assert.deepStrictEqual(calls[0], ['https://emaki.ai/api/video/ai', { prompt: 'a fox in snow', model: 'seedance_2_5', parameters: { duration: 5 } }, 'Bearer sk-test']);
  assert.deepStrictEqual(calls[1][1], { videoId: 'v9' });
  await assert.rejects(new Emaki({ apiKey: '' }).credits(), (e) => e.kind === 'auth');
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
