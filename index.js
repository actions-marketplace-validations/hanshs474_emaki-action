// emaki GitHub Action. Plain node, no dependencies: inputs come from INPUT_* env vars,
// outputs go to $GITHUB_OUTPUT.
'use strict';
const fs = require('fs');
const path = require('path');
const { Emaki, MODEL_VIDEO, MODEL_IMAGE } = require('./client');

const input = (name) => (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim();

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}

/** Build the "parameters" object from the action inputs. */
function buildParameters(model, get) {
  const p = {};
  const extra = get('parameters');
  if (extra) Object.assign(p, JSON.parse(extra));
  if (get('image-url')) p.image = get('image-url');
  if (get('aspect-ratio')) p[model === 'veo_3_1' ? 'aspectRatio' : 'aspect_ratio'] = get('aspect-ratio');
  if (get('duration')) p.duration = Number(get('duration'));
  if (get('resolution')) p.resolution = get('resolution');
  return p;
}

async function main() {
  const key = input('api-key');
  if (key) console.log(`::add-mask::${key}`);
  const image = input('media') === 'image';
  const model = input('model') || (image ? MODEL_IMAGE : MODEL_VIDEO);
  const client = new Emaki({ apiKey: key });
  const id = await client.submit(input('prompt'), model, buildParameters(model, input));
  setOutput('id', id);
  console.log(`submitted ${model} run ${id}; polling`);
  const url = await client.wait(id, {
    timeoutMs: (Number(input('timeout-minutes')) || 15) * 60_000,
    pollMs: image ? 3_000 : 5_000,
  });
  setOutput('url', url);
  const out = input('output-path');
  if (out) {
    const target = path.resolve(process.env.GITHUB_WORKSPACE || '.', out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
    setOutput('path', target);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.log(`::error::${err.message || err}`);
    process.exit(1);
  });
}

module.exports = { buildParameters };
