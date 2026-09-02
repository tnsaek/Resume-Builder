import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createApiRequest } from './useApi.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const mockResponse = ({ ok = true, data, jsonError } = {}) => ({
  ok,
  json: async () => {
    if (jsonError) throw jsonError;
    return data;
  }
});

test('returns parsed data for successful responses', async () => {
  globalThis.fetch = async () => mockResponse({ data: { success: true } });

  const apiRequest = createApiRequest();
  const result = await apiRequest('/api/profile');

  assert.deepEqual(result, { success: true });
});

test('sends JSON content type by default', async () => {
  let requestOptions;
  globalThis.fetch = async (path, options) => {
    requestOptions = { path, options };
    return mockResponse({ data: { ok: true } });
  };

  const apiRequest = createApiRequest();
  await apiRequest('/api/profile', { method: 'POST', body: '{"name":"Jane"}' });

  assert.equal(requestOptions.path, '/api/profile');
  assert.equal(requestOptions.options.method, 'POST');
  assert.equal(requestOptions.options.body, '{"name":"Jane"}');
  assert.equal(requestOptions.options.headers['Content-Type'], 'application/json');
});

test('adds bearer auth header when a token is provided', async () => {
  let headers;
  globalThis.fetch = async (path, options) => {
    headers = options.headers;
    return mockResponse({ data: { ok: true } });
  };

  const apiRequest = createApiRequest('abc123');
  await apiRequest('/api/account');

  assert.equal(headers.Authorization, 'Bearer abc123');
});

test('does not add auth header when token is missing', async () => {
  let headers;
  globalThis.fetch = async (path, options) => {
    headers = options.headers;
    return mockResponse({ data: { ok: true } });
  };

  const apiRequest = createApiRequest('');
  await apiRequest('/api/account');

  assert.equal(headers.Authorization, undefined);
});

test('preserves custom headers and allows content type override', async () => {
  let headers;
  globalThis.fetch = async (path, options) => {
    headers = options.headers;
    return mockResponse({ data: { ok: true } });
  };

  const apiRequest = createApiRequest('token');
  await apiRequest('/api/upload', {
    headers: {
      'Content-Type': 'text/plain',
      'X-Trace-Id': 'trace-1'
    }
  });

  assert.equal(headers['Content-Type'], 'text/plain');
  assert.equal(headers['X-Trace-Id'], 'trace-1');
  assert.equal(headers.Authorization, 'Bearer token');
});

test('throws server-provided error message for unsuccessful responses', async () => {
  globalThis.fetch = async () => mockResponse({ ok: false, data: { error: 'Unable to save profile' } });

  const apiRequest = createApiRequest();

  await assert.rejects(apiRequest('/api/profile'), {
    message: 'Unable to save profile'
  });
});

test('throws a fallback error for unsuccessful responses without JSON error text', async () => {
  globalThis.fetch = async () => mockResponse({ ok: false, data: {} });

  const apiRequest = createApiRequest();

  await assert.rejects(apiRequest('/api/profile'), {
    message: 'Request failed'
  });
});

test('returns an empty object for successful responses with invalid JSON', async () => {
  globalThis.fetch = async () => mockResponse({ jsonError: new SyntaxError('Unexpected token') });

  const apiRequest = createApiRequest();
  const result = await apiRequest('/api/health');

  assert.deepEqual(result, {});
});
