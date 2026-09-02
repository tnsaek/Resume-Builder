import { Router } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { handleValidationErrors } from '../middleware/handleValidationErrors.js';

const router = Router();

const textValue = (value, maxLength) => String(value || '').trim().substring(0, maxLength);
const jsonValue = (value) => JSON.stringify(value);
const resumePointsValue = (value) =>
  (Array.isArray(value) ? value : [])
    .slice(0, 12)
    .map((item) => textValue(item, 500))
    .filter(Boolean);

const draftPayloadValidators = [
  body('title').optional().isString().trim().isLength({ max: 255 }).withMessage('Title must be 255 characters or less'),
  body('jobPost')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20000 })
    .withMessage('Job post is required and must be 20000 characters or less'),
  body('resumePoints').isArray({ max: 12 }).withMessage('Resume points must be a list of up to 12 items'),
  body('coverLetter')
    .isString()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Cover letter must be 10000 characters or less')
];

const renameDraftValidators = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be 255 characters or less')
];

const draftIdValidator = param('id').isInt({ min: 1 }).withMessage('Draft id must be a positive integer');

const toDraftResponse = (row) => ({
  id: row.id,
  title: row.title,
  jobPost: row.job_post,
  resumePoints: Array.isArray(row.resume_points) ? row.resume_points : [],
  coverLetter: row.cover_letter,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM saved_drafts
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    res.json({
      drafts: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('[drafts list error]', error.message);
    res.status(500).json({ error: 'Unable to load saved drafts' });
  }
});

router.get('/drafts/:id', authenticateToken, draftIdValidator, handleValidationErrors, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, job_post, resume_points, cover_letter, created_at, updated_at
       FROM saved_drafts
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    const draft = result.rows[0];
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ draft: toDraftResponse(draft) });
  } catch (error) {
    console.error('[draft get error]', error.message);
    res.status(500).json({ error: 'Unable to load saved draft' });
  }
});

router.post('/drafts', authenticateToken, draftPayloadValidators, handleValidationErrors, async (req, res) => {
  const title = textValue(req.body.title, 255) || 'Untitled draft';
  const jobPost = textValue(req.body.jobPost, 20000);
  const resumePoints = resumePointsValue(req.body.resumePoints);
  const coverLetter = textValue(req.body.coverLetter, 10000);

  try {
    const result = await pool.query(
      `INSERT INTO saved_drafts (user_id, title, job_post, resume_points, cover_letter)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, job_post, resume_points, cover_letter, created_at, updated_at`,
      [req.user.id, title, jobPost, jsonValue(resumePoints), coverLetter]
    );

    res.status(201).json({ draft: toDraftResponse(result.rows[0]) });
  } catch (error) {
    console.error('[draft create error]', error.message);
    res.status(500).json({ error: 'Unable to save draft' });
  }
});

router.put('/drafts/:id', authenticateToken, draftIdValidator, draftPayloadValidators, handleValidationErrors, async (req, res) => {
  const title = textValue(req.body.title, 255) || 'Untitled draft';
  const jobPost = textValue(req.body.jobPost, 20000);
  const resumePoints = resumePointsValue(req.body.resumePoints);
  const coverLetter = textValue(req.body.coverLetter, 10000);

  try {
    const result = await pool.query(
      `UPDATE saved_drafts
       SET title = $1,
           job_post = $2,
           resume_points = $3,
           cover_letter = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, title, job_post, resume_points, cover_letter, created_at, updated_at`,
      [title, jobPost, jsonValue(resumePoints), coverLetter, req.params.id, req.user.id]
    );

    const draft = result.rows[0];
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ draft: toDraftResponse(draft) });
  } catch (error) {
    console.error('[draft update error]', error.message);
    res.status(500).json({ error: 'Unable to update draft' });
  }
});

router.patch(
  '/drafts/:id/rename',
  authenticateToken,
  draftIdValidator,
  renameDraftValidators,
  handleValidationErrors,
  async (req, res) => {
    const title = textValue(req.body.title, 255);

    try {
      const result = await pool.query(
        `UPDATE saved_drafts
         SET title = $1,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING id, title, created_at, updated_at`,
        [title, req.params.id, req.user.id]
      );

      const draft = result.rows[0];
      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      res.json({
        draft: {
          id: draft.id,
          title: draft.title,
          createdAt: draft.created_at,
          updatedAt: draft.updated_at
        }
      });
    } catch (error) {
      console.error('[draft rename error]', error.message);
      res.status(500).json({ error: 'Unable to rename draft' });
    }
  }
);

router.delete('/drafts/:id', authenticateToken, draftIdValidator, handleValidationErrors, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM saved_drafts
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[draft delete error]', error.message);
    res.status(500).json({ error: 'Unable to delete draft' });
  }
});

export default router;
