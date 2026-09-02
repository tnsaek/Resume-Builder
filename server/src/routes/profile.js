import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

const textValue = (value, maxLength) => String(value || '').trim().substring(0, maxLength);
const listValue = (value, itemMaxLength, maxItems) =>
  (Array.isArray(value) ? value : []).slice(0, maxItems).map((item) => textValue(item, itemMaxLength)).filter(Boolean);
const jsonValue = (value) => JSON.stringify(value);

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
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
       FROM profiles
       WHERE user_id = $1`,
      [req.user.id]
    );
    const profile = result.rows[0] || {
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
    };

    res.json(profile);
  } catch (error) {
    console.error('[profile get error]', error.message);
    res.status(500).json({ error: 'Unable to load profile' });
  }
});

router.post('/profile', authenticateToken, async (req, res) => {
  const {
    fullName,
    email,
    phone,
    location,
    linkedinUrl,
    portfolioUrl,
    githubUrl,
    headline,
    summary,
    skills,
    tools,
    workHistory,
    education,
    certifications,
    projects,
    achievements,
    volunteerWork,
    languages,
    jobPreferences,
    availability,
    workAuthorization
  } = req.body;

  const profileData = {
    full_name: textValue(fullName, 255),
    email: textValue(email, 255),
    phone: textValue(phone, 50),
    location: textValue(location, 255),
    linkedin_url: textValue(linkedinUrl, 500),
    portfolio_url: textValue(portfolioUrl, 500),
    github_url: textValue(githubUrl, 500),
    headline: textValue(headline, 500),
    summary: textValue(summary, 3000),
    skills: listValue(skills, 100, 150),
    tools: listValue(tools, 100, 150),
    work_history: listValue(workHistory, 1500, 75),
    education: listValue(education, 1000, 25),
    certifications: listValue(certifications, 500, 50),
    projects: listValue(projects, 1500, 50),
    achievements: listValue(achievements, 500, 75),
    volunteer_work: listValue(volunteerWork, 1000, 25),
    languages: listValue(languages, 100, 25),
    job_preferences: {
      targetRoles: listValue(jobPreferences?.targetRoles, 100, 25),
      targetIndustries: listValue(jobPreferences?.targetIndustries, 100, 25),
      preferredLocations: listValue(jobPreferences?.preferredLocations, 100, 25),
      workModes: listValue(jobPreferences?.workModes, 50, 10),
      salaryExpectation: textValue(jobPreferences?.salaryExpectation, 100),
      notes: textValue(jobPreferences?.notes, 1000)
    },
    availability: textValue(availability, 255),
    work_authorization: textValue(workAuthorization, 255)
  };

  try {
    await pool.query(
      `INSERT INTO profiles (
         user_id,
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
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         location = EXCLUDED.location,
         linkedin_url = EXCLUDED.linkedin_url,
         portfolio_url = EXCLUDED.portfolio_url,
         github_url = EXCLUDED.github_url,
         headline = EXCLUDED.headline,
         summary = EXCLUDED.summary,
         skills = EXCLUDED.skills,
         tools = EXCLUDED.tools,
         work_history = EXCLUDED.work_history,
         education = EXCLUDED.education,
         certifications = EXCLUDED.certifications,
         projects = EXCLUDED.projects,
         achievements = EXCLUDED.achievements,
         volunteer_work = EXCLUDED.volunteer_work,
         languages = EXCLUDED.languages,
         job_preferences = EXCLUDED.job_preferences,
         availability = EXCLUDED.availability,
         work_authorization = EXCLUDED.work_authorization,
         updated_at = NOW()`,
      [
        req.user.id,
        profileData.full_name,
        profileData.email,
        profileData.phone,
        profileData.location,
        profileData.linkedin_url,
        profileData.portfolio_url,
        profileData.github_url,
        profileData.headline,
        profileData.summary,
        jsonValue(profileData.skills),
        jsonValue(profileData.tools),
        jsonValue(profileData.work_history),
        jsonValue(profileData.education),
        jsonValue(profileData.certifications),
        jsonValue(profileData.projects),
        jsonValue(profileData.achievements),
        jsonValue(profileData.volunteer_work),
        jsonValue(profileData.languages),
        jsonValue(profileData.job_preferences),
        profileData.availability,
        profileData.work_authorization
      ]
    );

    res.json({ success: true, profile: profileData });
  } catch (error) {
    console.error('[profile save error]', error.message);
    res.status(500).json({ error: 'Unable to save profile' });
  }
});

export default router;
