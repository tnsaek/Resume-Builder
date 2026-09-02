import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import authRoutes from './auth.js';
import { pool } from '../db.js';

const originalConsoleError = console.error;
const originalQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);
const originalCreateTransport = nodemailer.createTransport;
const jwtSecret = process.env.JWT_SECRET || 'test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = jwtSecret;
  console.error = () => {};
});

afterEach(() => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
  nodemailer.createTransport = originalCreateTransport;
  console.error = originalConsoleError;
});

const createPoolMock = ({ queryResults = [], clientQueryResults = [] } = {}) => {
  const calls = [];
  const clientCalls = [];
  const client = {
    released: false,
    query: async (sql, params) => {
      clientCalls.push({ sql: String(sql), params });
      const result = clientQueryResults.shift();
      if (result instanceof Error) throw result;
      return result || { rows: [] };
    },
    release: () => {
      client.released = true;
    }
  };

  pool.query = async (sql, params) => {
    calls.push({ sql: String(sql), params });
    const result = queryResults.shift();
    if (result instanceof Error) throw result;
    return result || { rows: [] };
  };

  pool.connect = async () => client;

  return { calls, clientCalls, client };
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', authRoutes);
  return app;
};

const request = async (app, path, { method = 'GET', body, token } = {}) => {
  const server = await new Promise((resolve) => {
    const runningServer = app.listen(0, () => resolve(runningServer));
  });

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const signToken = (payload = { id: 7, email: 'user@example.com' }) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

test('register creates a user, hashes the password, and returns public account fields', async () => {
  const db = createPoolMock({
    queryResults: [{ rows: [{ id: 1, email: 'new@example.com', profile_image_url: null }] }]
  });

  const response = await request(createApp(), '/api/register', {
    method: 'POST',
    body: { email: 'NEW@EXAMPLE.COM', password: 'password123' }
  });

  assert.equal(response.status, 201);
  assert.equal(response.data.user.id, 1);
  assert.equal(response.data.user.email, 'new@example.com');
  assert.equal(response.data.user.profileImageUrl, '');
  assert.equal(jwt.verify(response.data.token, process.env.JWT_SECRET).email, 'new@example.com');
  assert.equal(db.calls[0].params[0], 'new@example.com');
  assert.equal(await bcrypt.compare('password123', db.calls[0].params[1]), true);
});

test('register rejects duplicate email addresses', async () => {
  const error = new Error('duplicate');
  error.code = '23505';
  createPoolMock({ queryResults: [error] });

  const response = await request(createApp(), '/api/register', {
    method: 'POST',
    body: { email: 'taken@example.com', password: 'password123' }
  });

  assert.equal(response.status, 409);
  assert.deepEqual(response.data, { error: 'Email is already registered' });
});

test('register validates password length before database access', async () => {
  const db = createPoolMock();

  const response = await request(createApp(), '/api/register', {
    method: 'POST',
    body: { email: 'new@example.com', password: 'short' }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.data, { error: 'Password must be at least 8 characters' });
  assert.equal(db.calls.length, 0);
});

test('login returns token and account data for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('password123', 4);
  createPoolMock({
    queryResults: [{ rows: [{ id: 2, email: 'user@example.com', password_hash: passwordHash, profile_image_url: 'https://cdn.test/me.jpg' }] }]
  });

  const response = await request(createApp(), '/api/login', {
    method: 'POST',
    body: { email: 'user@example.com', password: 'password123' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data.user, {
    id: 2,
    email: 'user@example.com',
    profileImageUrl: 'https://cdn.test/me.jpg'
  });
  assert.equal(jwt.verify(response.data.token, process.env.JWT_SECRET).id, 2);
});

test('login rejects unknown users and wrong passwords with the same response', async () => {
  createPoolMock({ queryResults: [{ rows: [] }] });
  const missingUserResponse = await request(createApp(), '/api/login', {
    method: 'POST',
    body: { email: 'missing@example.com', password: 'password123' }
  });

  const passwordHash = await bcrypt.hash('different', 4);
  createPoolMock({
    queryResults: [{ rows: [{ id: 2, email: 'user@example.com', password_hash: passwordHash, profile_image_url: null }] }]
  });
  const wrongPasswordResponse = await request(createApp(), '/api/login', {
    method: 'POST',
    body: { email: 'user@example.com', password: 'password123' }
  });

  assert.equal(missingUserResponse.status, 401);
  assert.deepEqual(missingUserResponse.data, { error: 'Invalid email or password' });
  assert.equal(wrongPasswordResponse.status, 401);
  assert.deepEqual(wrongPasswordResponse.data, { error: 'Invalid email or password' });
});

test('account lookup requires a valid token and returns user details', async () => {
  createPoolMock({
    queryResults: [{ rows: [{ id: 7, email: 'user@example.com', profile_image_url: null }] }]
  });

  const unauthorizedResponse = await request(createApp(), '/api/account');
  const authorizedResponse = await request(createApp(), '/api/account', { token: signToken() });

  assert.equal(unauthorizedResponse.status, 401);
  assert.deepEqual(unauthorizedResponse.data, { error: 'Missing authentication token' });
  assert.equal(authorizedResponse.status, 200);
  assert.deepEqual(authorizedResponse.data, {
    user: { id: 7, email: 'user@example.com', profileImageUrl: '' }
  });
});

test('account update validates profile image URLs and stores valid account changes', async () => {
  const db = createPoolMock({
    queryResults: [{ rows: [{ id: 7, email: 'updated@example.com', profile_image_url: 'https://cdn.test/me.jpg' }] }]
  });
  const token = signToken();

  const invalidResponse = await request(createApp(), '/api/account', {
    method: 'PATCH',
    token,
    body: { email: 'updated@example.com', profileImageUrl: 'not-a-url' }
  });
  const validResponse = await request(createApp(), '/api/account', {
    method: 'PATCH',
    token,
    body: { email: 'updated@example.com', profileImageUrl: 'https://cdn.test/me.jpg' }
  });

  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(invalidResponse.data, { error: 'Profile image must be a valid URL' });
  assert.equal(validResponse.status, 200);
  assert.deepEqual(validResponse.data.user, {
    id: 7,
    email: 'updated@example.com',
    profileImageUrl: 'https://cdn.test/me.jpg'
  });
  assert.deepEqual(db.calls[0].params, ['updated@example.com', 'https://cdn.test/me.jpg', 7]);
});

test('password change verifies the current password before updating the hash', async () => {
  const currentHash = await bcrypt.hash('oldpassword', 4);
  const db = createPoolMock({
    queryResults: [
      { rows: [{ id: 7, password_hash: currentHash }] },
      { rows: [] }
    ]
  });

  const response = await request(createApp(), '/api/password', {
    method: 'PATCH',
    token: signToken(),
    body: { currentPassword: 'oldpassword', newPassword: 'newpassword' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { success: true });
  assert.equal(await bcrypt.compare('newpassword', db.calls[1].params[0]), true);
  assert.equal(db.calls[1].params[1], 7);
});

test('password change rejects an incorrect current password', async () => {
  const currentHash = await bcrypt.hash('different', 4);
  const db = createPoolMock({
    queryResults: [{ rows: [{ id: 7, password_hash: currentHash }] }]
  });

  const response = await request(createApp(), '/api/password', {
    method: 'PATCH',
    token: signToken(),
    body: { currentPassword: 'oldpassword', newPassword: 'newpassword' }
  });

  assert.equal(response.status, 401);
  assert.deepEqual(response.data, { error: 'Current password is incorrect' });
  assert.equal(db.calls.length, 1);
});

test('forgot password returns generic success for unknown email without sending mail', async () => {
  const db = createPoolMock({ queryResults: [{ rows: [] }] });
  let sentMail = null;
  nodemailer.createTransport = () => ({
    sendMail: async (payload) => {
      sentMail = payload;
    }
  });

  const response = await request(createApp(), '/api/forgot-password', {
    method: 'POST',
    body: { email: 'missing@example.com' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {
    success: true,
    message: 'If that email is registered, a reset link has been sent.'
  });
  assert.equal(db.calls.length, 1);
  assert.equal(sentMail, null);
});

test('forgot password stores a hashed token and sends reset email for known users', async () => {
  const db = createPoolMock({
    queryResults: [
      { rows: [{ id: 3, email: 'user@example.com' }] },
      { rows: [] }
    ]
  });
  let sentMail = null;
  nodemailer.createTransport = () => ({
    sendMail: async (payload) => {
      sentMail = payload;
    }
  });

  const response = await request(createApp(), '/api/forgot-password', {
    method: 'POST',
    body: { email: 'user@example.com' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {
    success: true,
    message: 'If that email is registered, a reset link has been sent.'
  });
  assert.equal(db.calls[1].params[0], 3);
  assert.match(db.calls[1].params[1], /^[a-f0-9]{64}$/);
  assert.notEqual(db.calls[1].params[1], sentMail.text);
  assert.equal(sentMail.to, 'user@example.com');
  assert.match(sentMail.text, /resetToken=[a-f0-9]{64}/);
});

test('reset password rejects invalid or expired reset tokens', async () => {
  createPoolMock({ queryResults: [{ rows: [] }] });

  const response = await request(createApp(), '/api/reset-password', {
    method: 'POST',
    body: { token: 'a'.repeat(64), newPassword: 'newpassword' }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.data, { error: 'Reset link is invalid or expired' });
});

test('reset password updates password and marks reset tokens used in one transaction', async () => {
  const db = createPoolMock({
    queryResults: [{ rows: [{ id: 9, user_id: 3 }] }],
    clientQueryResults: [{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }]
  });

  const response = await request(createApp(), '/api/reset-password', {
    method: 'POST',
    body: { token: 'a'.repeat(64), newPassword: 'newpassword' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { success: true });
  assert.equal(db.client.released, true);
  assert.equal(db.clientCalls[0].sql, 'BEGIN');
  assert.equal(await bcrypt.compare('newpassword', db.clientCalls[1].params[0]), true);
  assert.equal(db.clientCalls[1].params[1], 3);
  assert.deepEqual(db.clientCalls[2].params, [9]);
  assert.deepEqual(db.clientCalls[3].params, [3]);
  assert.equal(db.clientCalls[4].sql, 'COMMIT');
});

test('reset password rolls back when the transaction fails', async () => {
  const db = createPoolMock({
    queryResults: [{ rows: [{ id: 9, user_id: 3 }] }],
    clientQueryResults: [{ rows: [] }, new Error('update failed')]
  });

  const response = await request(createApp(), '/api/reset-password', {
    method: 'POST',
    body: { token: 'a'.repeat(64), newPassword: 'newpassword' }
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.data, { error: 'Unable to reset password' });
  assert.equal(db.client.released, true);
  assert.equal(db.clientCalls[0].sql, 'BEGIN');
  assert.equal(db.clientCalls[2].sql, 'ROLLBACK');
});

test('reset password validates token and new password before database access', async () => {
  const db = createPoolMock();

  const response = await request(createApp(), '/api/reset-password', {
    method: 'POST',
    body: { token: 'short', newPassword: 'short' }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.data, { error: 'Reset token is required' });
  assert.equal(db.calls.length, 0);
});
