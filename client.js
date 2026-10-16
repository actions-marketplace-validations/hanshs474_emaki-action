// emaki HTTP client (https://emaki.ai). Plain node 20, no dependencies.
'use strict';

const BASE = 'https://emaki.ai';
const KEYS_URL = `${BASE}/settings/apikeys`;
const MODEL_VIDEO = 'seedance_2_5';
const MODEL_IMAGE = 'nano_banana_2_lite';
const NEEDS_KEY = `emaki needs an API key. Create one at ${KEYS_URL} and pass it as the api-key input from a secret.`;

class EmakiError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.kind = kind; // auth | quota | plan | busy | rejected | validation | failed | timeout | api
    this.status = status;
  }
}

/** Map an HTTP status and JSON error body to an EmakiError. */
function classify(status, body) {
  const msg = (body && (body.error || body.message)) || 'request failed';
  const tag = body && typeof body.code === 'string' ? body.code : '';
  let kind = 'api';
  if (status === 401) kind = 'auth';
  else if (status === 402) kind = 'quota';
  else if (status === 403) kind = 'plan';
  else if (status === 409) kind = 'busy';
  else if (tag === 'content_cooldown' || tag === 'content_blocked') kind = 'rejected';
  else if (status === 400) kind = 'validation';
  else if (status === 200 && /api key|unauthorized/i.test(msg)) kind = 'auth'; // credits answers 200 + code -1
  const hint = { auth: ` (create a key at ${KEYS_URL})`, quota: ' (top up at https://emaki.ai/pricing)' }[kind] || '';
  return new EmakiError(kind, `emaki ${kind} error: ${msg}${msg.includes('emaki.ai') ? '' : hint}`, status);
}

function parseSubmit(status, body) {
  if (status === 200 && body && body.success && body.data && body.data.id) return String(body.data.id);
  throw classify(status, body);
}

function parseStatus(status, body) {
  if (status === 200 && body && body.success && body.data) return body.data;
  throw classify(status, body);
}

function parseCredits(status, body) {
  if (status === 200 && body && body.code === 0 && body.data && typeof body.data.remainingCredits === 'number') {
    return body.data.remainingCredits;
  }
  throw classify(status, body);
}

class Emaki {
  constructor({ apiKey = process.env.EMAKI_API_KEY, base = BASE, fetch: f = globalThis.fetch } = {}) {
    this.key = String(apiKey || '').trim();
    this.base = base;
    this.fetch = f;
  }

  async post(path, payload) {
    if (!this.key) throw new EmakiError('auth', NEEDS_KEY);
    const res = await this.fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json', 'user-agent': 'emaki-action/1.0.0' },
      body: JSON.stringify(payload || {}),
    });
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON error page */ }
    return [res.status, body];
  }

  async credits() { return parseCredits(...(await this.post('/api/user/get-user-credits', {}))); }

  async submit(prompt, model, parameters = {}) {
    if (!String(prompt || '').trim()) throw new EmakiError('validation', 'prompt is required');
    return parseSubmit(...(await this.post('/api/video/ai', { prompt, model, parameters })));
  }

  async status(id) { return parseStatus(...(await this.post('/api/video/status', { videoId: id }))); }

  /** Poll a run every pollMs until it completes; resolve to the file URL. */
  async wait(id, { timeoutMs = 15 * 60_000, pollMs = 5_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollMs));
      let d;
      try { d = await this.status(id); } catch (e) {
        if (e.kind === 'auth') throw e;
        continue; // a dropped poll is not a failed run
      }
      if ((d.status === 'completed' || d.status === 'succeeded') && d.videoUrl) return d.videoUrl;
      if (d.status === 'failed') throw new EmakiError('failed', `emaki run ${id} failed (${d.failureCode || 'unknown'})`);
    }
    throw new EmakiError('timeout', `emaki run ${id} did not finish in time; it may still land in your emaki library`);
  }
}

module.exports = { Emaki, EmakiError, classify, parseSubmit, parseStatus, parseCredits, BASE, KEYS_URL, MODEL_VIDEO, MODEL_IMAGE };
