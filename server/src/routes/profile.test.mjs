import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import profileRoutes from './profile.js';
import { pool } from '../db.js';

const originalConsoleError = console.error;
const originalQuery = pool.query.bind(pool);
const originalJwtSecret = process.env.JWT_SECRET;
const testSecret = 'profile-route-test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = testSecret;
  console.error = () => {};
});

afterEach(() => {
  pool.query = originalQuery;
  console.error = originalConsoleError;
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

const createPoolMock = ({ queryResults = [] } = {}) => {
  const calls = [];

  pool.query = async (sql, params) => {
    calls.push({ sql: String(sql), params });
    const result = queryResults.shift();
    if (result instanceof Error) throw result;
    return result || { rows: [] };
  };

  return { calls };
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', profileRoutes);
  return app;
};

const signToken = (payload = { id: 7, email: 'user@example.com' }) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

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

test('profile routes reject requests without a valid token', async () => {
  const db = createPoolMock();

  const response = await request(createApp(), '/api/profile');

  assert.equal(response.status, 401);
  assert.deepEqual(response.data, { error: 'Missing authentication token' });
  assert.equal(db.calls.length, 0);
});

test('get profile returns an empty profile shape when none exists', async () => {
  const db = createPoolMock({ queryResults: [{ rows: [] }] });

  const response = await request(createApp(), '/api/profile', { token: signToken() });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    portfolio_url: '',
    github_url: '',
    headline: '',
    summary: '',
    skills: [],
    tools: [],
    work_history: [],
    education: [],
    certifications: [],
    projects: [],
    achievements: [],
    volunteer_work: [],
    languages: [],
    job_preferences: {},
    availability: '',
    work_authorization: ''
  });
  assert.equal(db.calls[0].params[0], 7);
});

test('get profile returns the saved profile row for the authenticated user', async () => {
  const savedProfile = {
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123 4567',
    location: 'New York, NY',
    linkedin_url: 'https://linkedin.com/in/janedoe',
    portfolio_url: 'https://janedoe.com',
    github_url: 'https://github.com/janedoe',
    headline: 'Product Manager',
    summary: 'Leads product teams.',
    skills: ['Product strategy'],
    tools: ['Figma'],
    work_history: ['Example Inc.'],
    education: ['Example University'],
    certifications: ['CSPO'],
    projects: ['Resume builder'],
    achievements: ['Increased activation'],
    volunteer_work: ['Mentor'],
    languages: ['English'],
    job_preferences: { targetRoles: ['Product Manager'] },
    availability: 'Two weeks',
    work_authorization: 'Authorized'
  };
  createPoolMock({ queryResults: [{ rows: [savedProfile] }] });

  const response = await request(createApp(), '/api/profile', { token: signToken() });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, savedProfile);
});

test('save profile normalizes text fields and array fields before writing', async () => {
  const db = createPoolMock({ queryResults: [{ rows: [] }] });
  const longText = 'x'.repeat(400);

  const response = await request(createApp(), '/api/profile', {
    method: 'POST',
    token: signToken(),
    body: {
      fullName: '  Jane Doe  ',
      email: ' jane@example.com ',
      phone: ' 1234567890 '.repeat(6),
      location: ' Remote ',
      linkedinUrl: ' https://linkedin.com/in/janedoe ',
      portfolioUrl: ' https://janedoe.com ',
      githubUrl: ' https://github.com/janedoe ',
      headline: ` ${longText} `,
      summary: '  Senior operator  ',
      skills: [' JavaScript ', '', null, ' Product strategy '],
      tools: 'not-an-array',
      workHistory: [' Example Inc. '],
      education: [' Example University '],
      certifications: [' CSPO '],
      projects: [' Resume builder '],
      achievements: [' Increased activation '],
      volunteerWork: [' Mentor '],
      languages: [' English '],
      jobPreferences: {
        targetRoles: [' Product Manager ', ''],
        targetIndustries: [' Climate tech '],
        preferredLocations: [' Remote '],
        workModes: [' Full-time '],
        salaryExpectation: ' $120K ',
        notes: ' Open to hybrid '
      },
      availability: ' Two weeks ',
      workAuthorization: ' Authorized '
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.success, true);
  assert.equal(response.data.profile.full_name, 'Jane Doe');
  assert.equal(response.data.profile.email, 'jane@example.com');
  assert.equal(response.data.profile.phone.length, 50);
  assert.equal(response.data.profile.headline.length, 400);
  assert.deepEqual(response.data.profile.skills, ['JavaScript', 'Product strategy']);
  assert.deepEqual(response.data.profile.tools, []);
  assert.deepEqual(response.data.profile.job_preferences, {
    targetRoles: ['Product Manager'],
    targetIndustries: ['Climate tech'],
    preferredLocations: ['Remote'],
    workModes: ['Full-time'],
    salaryExpectation: '$120K',
    notes: 'Open to hybrid'
  });
  assert.deepEqual(db.calls[0].params.slice(0, 5), [
    7,
    'Jane Doe',
    'jane@example.com',
    '1234567890  1234567890  1234567890  1234567890  12',
    'Remote'
  ]);
  assert.equal(db.calls[0].params[10], JSON.stringify(['JavaScript', 'Product strategy']));
  assert.equal(db.calls[0].params[11], JSON.stringify([]));
  assert.equal(db.calls[0].params[19], JSON.stringify(response.data.profile.job_preferences));
});

test('save profile limits array item count and item length', async () => {
  const db = createPoolMock({ queryResults: [{ rows: [] }] });

  const response = await request(createApp(), '/api/profile', {
    method: 'POST',
    token: signToken(),
    body: {
      skills: Array.from({ length: 160 }, (_, index) => ` skill-${index} `),
      workHistory: ['x'.repeat(1600)],
      jobPreferences: {
        workModes: Array.from({ length: 12 }, (_, index) => ` mode-${index} `)
      }
    }
  });

  const savedSkills = JSON.parse(db.calls[0].params[10]);
  const savedWorkHistory = JSON.parse(db.calls[0].params[12]);
  const savedPreferences = JSON.parse(db.calls[0].params[19]);

  assert.equal(response.status, 200);
  assert.equal(savedSkills.length, 150);
  assert.equal(savedWorkHistory.length, 1);
  assert.equal(savedWorkHistory[0].length, 1500);
  assert.equal(savedPreferences.workModes.length, 10);
});

test('get profile returns a 500 response when the database read fails', async () => {
  createPoolMock({ queryResults: [new Error('database unavailable')] });

  const response = await request(createApp(), '/api/profile', { token: signToken() });

  assert.equal(response.status, 500);
  assert.deepEqual(response.data, { error: 'Unable to load profile' });
});

test('save profile returns a 500 response when the database write fails', async () => {
  createPoolMock({ queryResults: [new Error('database unavailable')] });

  const response = await request(createApp(), '/api/profile', {
    method: 'POST',
    token: signToken(),
    body: { fullName: 'Jane Doe' }
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.data, { error: 'Unable to save profile' });
});
