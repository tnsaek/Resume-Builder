import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from './handleValidationErrors.js';

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/validate',
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    handleValidationErrors,
    (req, res) => {
      res.json({ success: true, body: req.body });
    }
  );

  return app;
};

const request = async (app, path, { method = 'POST', body: payload } = {}) => {
  const server = await new Promise((resolve) => {
    const runningServer = app.listen(0, () => resolve(runningServer));
  });

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('calls the next handler when validation passes', async () => {
  const app = createApp();

  const response = await request(app, '/validate', {
    body: { email: 'user@example.com', password: 'password123' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {
    success: true,
    body: { email: 'user@example.com', password: 'password123' }
  });
});

test('returns a 400 response with the first validation error message', async () => {
  const app = createApp();

  const response = await request(app, '/validate', {
    body: { email: 'not-an-email', password: 'short' }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.data, { error: 'Email must be valid' });
});

test('does not call the next route handler when validation fails', async () => {
  let downstreamCalled = false;
  const app = express();
  app.use(express.json());
  app.post(
    '/validate',
    body('name').notEmpty().withMessage('Name is required'),
    handleValidationErrors,
    (req, res) => {
      downstreamCalled = true;
      res.json({ success: true });
    }
  );

  const response = await request(app, '/validate', { body: { name: '' } });

  assert.equal(response.status, 400);
  assert.deepEqual(response.data, { error: 'Name is required' });
  assert.equal(downstreamCalled, false);
});
