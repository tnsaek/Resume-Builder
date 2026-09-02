import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { appBaseUrl, gmailAppPassword, gmailUser } from '../config.js';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { handleValidationErrors } from '../middleware/handleValidationErrors.js';

const router = Router();

const hashPassword = async (password) => bcrypt.hash(password, 10);
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);
const generateToken = (user) => jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const textValue = (value, maxLength) => String(value || '').trim().substring(0, maxLength);
const toUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  profileImageUrl: user.profile_image_url || ''
});

const sendPasswordResetEmail = async ({ email, resetUrl }) => {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Password reset email is not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  await transporter.sendMail({
    from: `"Resume Builder" <${gmailUser}>`,
    to: email,
    subject: 'Reset your Resume Builder password',
    text: `Use this link to reset your password. It expires in 1 hour:\n\n${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
};

router.post(
  '/register',
  body('email').isEmail().normalizeEmail().trim(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const password_hash = await hashPassword(password);
      const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, profile_image_url',
        [email, password_hash]
      );

      const user = result.rows[0];
      const token = generateToken(user);
      res.status(201).json({ token, user: toUserResponse(user) });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email is already registered' });
      }
      console.error('[register error]', error.message);
      res.status(500).json({ error: 'Unable to register user' });
    }
  }
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail().trim(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await pool.query('SELECT id, email, password_hash, profile_image_url FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user);
      res.json({ token, user: toUserResponse(user) });
    } catch (error) {
      console.error('[login error]', error.message);
      res.status(500).json({ error: 'Unable to sign in' });
    }
  }
);

router.get('/account', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, profile_image_url FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    console.error('[account get error]', error.message);
    res.status(500).json({ error: 'Unable to load account' });
  }
});

router.patch(
  '/account',
  authenticateToken,
  body('email').isEmail().normalizeEmail().trim(),
  body('profileImageUrl')
    .optional({ checkFalsy: true })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Profile image must be a valid URL')
    .isLength({ max: 1000 })
    .withMessage('Profile image URL must be 1000 characters or less'),
  handleValidationErrors,
  async (req, res) => {
    const { email } = req.body;
    const profileImageUrl = textValue(req.body.profileImageUrl, 1000);

    try {
      const result = await pool.query(
        `UPDATE users
         SET email = $1,
             profile_image_url = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, profile_image_url`,
        [email, profileImageUrl || null, req.user.id]
      );
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({ token: generateToken(user), user: toUserResponse(user) });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email is already registered' });
      }
      console.error('[account update error]', error.message);
      res.status(500).json({ error: 'Unable to update account' });
    }
  }
);

router.patch(
  '/password',
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidationErrors,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
      const result = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
      const user = result.rows[0];

      if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await hashPassword(newPassword);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      console.error('[password change error]', error.message);
      res.status(500).json({ error: 'Unable to change password' });
    }
  }
);

router.post(
  '/forgot-password',
  body('email').isEmail().normalizeEmail().trim(),
  handleValidationErrors,
  async (req, res) => {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If that email is registered, a reset link has been sent.'
    };

    try {
      const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.json(genericResponse);
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, tokenHash]
      );

      const resetUrl = `${appBaseUrl.replace(/\/$/, '')}?resetToken=${rawToken}`;
      await sendPasswordResetEmail({ email: user.email, resetUrl });

      res.json(genericResponse);
    } catch (error) {
      console.error('[forgot password error]', error.message);
      res.status(500).json({ error: 'Unable to send password reset email' });
    }
  }
);

router.post(
  '/reset-password',
  body('token').isString().trim().isLength({ min: 32 }).withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidationErrors,
  async (req, res) => {
    const { token, newPassword } = req.body;

    try {
      const tokenHash = hashResetToken(token);
      const result = await pool.query(
        `SELECT id, user_id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()`,
        [tokenHash]
      );
      const resetToken = result.rows[0];

      if (!resetToken) {
        return res.status(400).json({ error: 'Reset link is invalid or expired' });
      }

      const passwordHash = await hashPassword(newPassword);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
        await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetToken.id]);
        await client.query(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE user_id = $1 AND used_at IS NULL`,
          [resetToken.user_id]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[reset password error]', error.message);
      res.status(500).json({ error: 'Unable to reset password' });
    }
  }
);

export default router;
