import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './authenticateToken.js';

const originalJwtSecret = process.env.JWT_SECRET;
const testSecret = 'middleware-test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = testSecret;
});

afterEach(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

const runMiddleware = (authorization) => {
  const req = { headers: { authorization } };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test('rejects requests without an authorization header', () => {
  const { res, nextCalled } = runMiddleware(undefined);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Missing authentication token' });
});

test('rejects authorization headers that are not bearer tokens', () => {
  const { res, nextCalled } = runMiddleware('Basic abc123');

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Missing authentication token' });
});

test('rejects malformed bearer tokens', () => {
  const { res, nextCalled } = runMiddleware('Bearer not-a-jwt');

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Invalid or expired authentication token' });
});

test('rejects tokens signed with a different secret', () => {
  const token = jwt.sign({ id: 7, email: 'user@example.com' }, 'wrong-secret', { expiresIn: '1h' });
  const { res, nextCalled } = runMiddleware(`Bearer ${token}`);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Invalid or expired authentication token' });
});

test('rejects expired tokens', () => {
  const token = jwt.sign({ id: 7, email: 'user@example.com' }, testSecret, { expiresIn: '-1s' });
  const { res, nextCalled } = runMiddleware(`Bearer ${token}`);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Invalid or expired authentication token' });
});

test('sets req.user and calls next for valid bearer tokens', () => {
  const token = jwt.sign({ id: 7, email: 'user@example.com' }, testSecret, { expiresIn: '1h' });
  const { req, res, nextCalled } = runMiddleware(`Bearer ${token}`);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.email, 'user@example.com');
});
