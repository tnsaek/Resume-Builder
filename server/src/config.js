import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 4000;
export const geminiApiKey = process.env.GEMINI_API_KEY || process.env['gemini.api-key'] || '';
export const geminiModel = process.env.GEMINI_MODEL || process.env['gemini.model'] || 'gemini-1.5-flash';
export const dailyGenerationLimit = Math.max(Number(process.env.DAILY_GENERATION_LIMIT || 5), 1);
export const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
export const gmailUser = process.env.GMAIL_USER || '';
export const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || '';
