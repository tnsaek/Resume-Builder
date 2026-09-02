import { Router } from 'express';
import { body } from 'express-validator';
import { dailyGenerationLimit, geminiApiKey, geminiModel } from '../config.js';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { handleValidationErrors } from '../middleware/handleValidationErrors.js';

const router = Router();

class GenerateError extends Error {
  constructor(message, statusCode = 500, details = '') {
    super(message);
    this.name = 'GenerateError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const profileColumns = `
  full_name,
  email,
  phone,
  location,
  linkedin_url,
  portfolio_url,
  github_url,
  headline,
  summary,
  skills,
  tools,
  work_history,
  education,
  certifications,
  projects,
  achievements,
  volunteer_work,
  languages,
  job_preferences,
  availability,
  work_authorization
`;

const generationSchema = {
  type: 'object',
  required: ['resumePoints', 'coverLetter'],
  properties: {
    resumePoints: {
      type: 'array',
      minItems: 4,
      maxItems: 8,
      items: { type: 'string' }
    },
    coverLetter: {
      type: 'string'
    }
  }
};

const requireGeminiKey = (req, res, next) => {
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'AI generation is not configured. Add GEMINI_API_KEY to the server environment and restart the server.' });
  }
  next();
};

const geminiErrorMessage = (status, providerMessage) => {
  if (status === 400) return 'AI generation request was rejected. Check the configured Gemini model name and try again.';
  if (status === 401 || status === 403) return 'AI generation is not authorized. Check the Gemini API key in the server environment.';
  if (status === 404) return 'Configured Gemini model was not found. Check GEMINI_MODEL in the server environment.';
  if (status === 429) return 'Gemini quota or rate limit was reached. Try again later.';
  if (status >= 500) return 'Gemini is temporarily unavailable. Try again later.';
  return providerMessage || 'AI generation failed.';
};

const reserveDailyGeneration = async (userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ai_usage (user_id, usage_date, generate_count)
       VALUES ($1, CURRENT_DATE, 0)
       ON CONFLICT (user_id, usage_date) DO NOTHING`,
      [userId]
    );

    const usage = await client.query(
      `SELECT generate_count
       FROM ai_usage
       WHERE user_id = $1 AND usage_date = CURRENT_DATE
       FOR UPDATE`,
      [userId]
    );

    const currentCount = usage.rows[0]?.generate_count || 0;
    if (currentCount >= dailyGenerationLimit) {
      await client.query('ROLLBACK');
      return { allowed: false, remaining: 0 };
    }

    const updated = await client.query(
      `UPDATE ai_usage
       SET generate_count = generate_count + 1
       WHERE user_id = $1 AND usage_date = CURRENT_DATE
       RETURNING generate_count`,
      [userId]
    );

    await client.query('COMMIT');
    return {
      allowed: true,
      remaining: Math.max(dailyGenerationLimit - updated.rows[0].generate_count, 0)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const releaseDailyGeneration = async (userId) => {
  await pool.query(
    `UPDATE ai_usage
     SET generate_count = GREATEST(generate_count - 1, 0)
     WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
    [userId]
  );
};

const loadProfile = async (userId) => {
  const result = await pool.query(`SELECT ${profileColumns} FROM profiles WHERE user_id = $1`, [userId]);
  return result.rows[0] || null;
};

const buildPrompt = ({ profile, jobPost }) => `
You are generating first-draft job application materials.

Rules:
- Use only facts present in the user profile.
- Do not invent employers, job titles, dates, degrees, certifications, tools, metrics, or personal background.
- If the job post asks for experience not in the profile, emphasize relevant transferable experience without claiming the missing requirement.
- Keep resume points concise, impact-oriented, and suitable for a one-page resume.
- Write the cover letter in a direct, professional voice.
- Return only valid JSON matching this exact shape:
{
  "resumePoints": ["4 to 8 tailored resume bullet strings"],
  "coverLetter": "A concise tailored cover letter"
}

User profile:
${JSON.stringify(profile, null, 2)}

Job post:
${jobPost}
`;

const parseGenerationResponse = (data) => {
  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new GenerateError('AI generation was blocked by the provider safety filters. Try a different job post or profile wording.', 422, blockReason);
  }

  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
    throw new GenerateError('AI generation stopped before producing usable text. Try again with a shorter job post.', 502, finishReason);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) {
    throw new GenerateError('AI response did not include generated text. Try again.', 502);
  }

  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new GenerateError('AI returned text in an unexpected format. Try generating again.', 502, error.message);
  }

  if (!Array.isArray(parsed.resumePoints) || typeof parsed.coverLetter !== 'string') {
    throw new GenerateError('AI response was missing resume points or cover letter. Try generating again.', 502);
  }

  const resumePoints = parsed.resumePoints.map((point) => String(point || '').trim()).filter(Boolean);
  const coverLetter = parsed.coverLetter.trim();
  if (resumePoints.length < 1 || !coverLetter) {
    throw new GenerateError('AI response did not include enough usable content. Try generating again.', 502);
  }

  return {
    resumePoints,
    coverLetter
  };
};

const callGemini = async ({ profile, jobPost }) => {
  const modelName = geminiModel.replace(/^models\//, '');
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt({ profile, jobPost }) }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          response_mime_type: 'application/json',
          response_schema: generationSchema
        }
      })
    });
  } catch (error) {
    throw new GenerateError('Could not reach Gemini. Check network access and try again.', 502, error.message);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data.error?.message || '';
    throw new GenerateError(geminiErrorMessage(response.status, providerMessage), response.status >= 500 ? 502 : response.status, providerMessage);
  }

  return parseGenerationResponse(data);
};

router.post(
  '/generate',
  authenticateToken,
  requireGeminiKey,
  body('jobPost')
    .isString()
    .trim()
    .isLength({ min: 50, max: 20000 })
    .withMessage('Job post must be between 50 and 20000 characters'),
  handleValidationErrors,
  async (req, res) => {
    const { jobPost } = req.body;

    try {
      const profile = await loadProfile(req.user.id);
      if (!profile) {
        return res.status(400).json({ error: 'Save your profile before generating a resume' });
      }

      const usage = await reserveDailyGeneration(req.user.id);
      if (!usage.allowed) {
        return res.status(429).json({ error: `Daily generation limit reached (${dailyGenerationLimit} per day)` });
      }

      try {
        const generated = await callGemini({ profile, jobPost });
        res.json({ ...generated, remainingGenerationsToday: usage.remaining });
      } catch (error) {
        await releaseDailyGeneration(req.user.id);
        throw error;
      }
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('[generate error]', {
        message: error.message,
        details: error.details || '',
        statusCode
      });
      res.status(statusCode).json({ error: error.message || 'Unable to generate application materials' });
    }
  }
);

export default router;
