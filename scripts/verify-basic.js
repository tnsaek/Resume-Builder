const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const checks = [
  {
    name: 'draft backend routes are registered',
    file: 'server/index.js',
    patterns: ["import draftRoutes from './src/routes/drafts.js'", "app.use('/api', draftRoutes)"]
  },
  {
    name: 'saved draft API supports list, open, create, and update',
    file: 'server/src/routes/drafts.js',
    patterns: ["router.get('/drafts'", "router.get('/drafts/:id'", "router.post('/drafts'", "router.put('/drafts/:id'"]
  },
  {
    name: 'saved draft API supports rename and delete',
    file: 'server/src/routes/drafts.js',
    patterns: ["router.patch(", "'/drafts/:id/rename'", "router.delete('/drafts/:id'"]
  },
  {
    name: 'migration runner is wired',
    file: 'server/src/db.js',
    patterns: ['schema_migrations', 'runMigrations', 'migrationsDir', 'initDb = runMigrations']
  },
  {
    name: 'initial migration creates password reset storage',
    file: 'server/migrations/001_initial_schema.sql',
    patterns: ['password_reset_tokens', 'token_hash', 'expires_at']
  },
  {
    name: 'initial migration creates core schema',
    file: 'server/migrations/001_initial_schema.sql',
    patterns: ['CREATE TABLE IF NOT EXISTS users', 'CREATE TABLE IF NOT EXISTS profiles', 'CREATE TABLE IF NOT EXISTS saved_drafts', 'CREATE TABLE IF NOT EXISTS ai_usage']
  },
  {
    name: 'gmail password reset config is present',
    file: 'server/src/config.js',
    patterns: ['gmailUser', 'gmailAppPassword', 'appBaseUrl']
  },
  {
    name: 'auth API supports change, forgot, and reset password',
    file: 'server/src/routes/auth.js',
    patterns: ["'/password'", "'/forgot-password'", "'/reset-password'", 'nodemailer', 'hashResetToken']
  },
  {
    name: 'account API supports email and profile image',
    file: 'server/src/routes/auth.js',
    patterns: ["'/account'", 'profile_image_url', 'profileImageUrl', 'generateToken(user)']
  },
  {
    name: 'profile save moves user into generation flow',
    file: 'client/src/App.jsx',
    patterns: ["setActivePage('generate')", 'Profile saved. You can now paste a job post']
  },
  {
    name: 'generation requires a saved profile',
    file: 'client/src/App.jsx',
    patterns: ['isProfileSaved', 'Save your profile before generating a resume.']
  },
  {
    name: 'generation uses Gemini from the server',
    file: 'server/src/routes/generate.js',
    patterns: ['geminiApiKey', 'geminiModel', 'generateContent', 'response_mime_type', 'callGemini']
  },
  {
    name: 'generation has user-friendly AI error handling',
    file: 'server/src/routes/generate.js',
    patterns: ['GenerateError', 'geminiErrorMessage', 'Could not reach Gemini', 'unexpected format', 'provider safety filters', 'Gemini quota or rate limit']
  },
  {
    name: 'saved versions list can open a draft',
    file: 'client/src/components/SavedDraftsList.jsx',
    patterns: ['onOpenDraft(draft.id)', 'No saved drafts yet.']
  },
  {
    name: 'saved versions list can rename and delete a draft',
    file: 'client/src/components/SavedDraftsList.jsx',
    patterns: ['onRenameDraft', 'onDeleteDraft', 'Rename', 'Delete', 'Confirm delete']
  },
  {
    name: 'auth UI supports forgot and reset password',
    file: 'client/src/components/LoginForm.jsx',
    patterns: ['Forgot password?', 'Send reset link', 'Reset password', 'onResetPassword']
  },
  {
    name: 'account UI supports logged-in password change',
    file: 'client/src/components/AccountPage.jsx',
    patterns: ['Security', 'Current password', 'Change password', 'onChangePassword']
  },
  {
    name: 'account UI supports email and profile image',
    file: 'client/src/components/AccountPage.jsx',
    patterns: ['accountEmail', 'profileImageUrl', 'Profile image URL', 'Save account']
  },
  {
    name: 'account page is available from app navigation',
    file: 'client/src/App.jsx',
    patterns: ["import AccountPage", "activePage === 'account'", '<AccountPage']
  },
  {
    name: 'idle session logout is wired',
    file: 'client/src/App.jsx',
    patterns: ['SESSION_IDLE_TIMEOUT_MS', 'SESSION_ACTIVITY_EVENTS', 'SESSION_LAST_ACTIVITY_KEY', 'getStoredSessionToken', 'Your session expired after inactivity']
  },
  {
    name: 'client uses section-specific loading states',
    file: 'client/src/App.jsx',
    patterns: ['initialLoading', 'setLoadingState', 'loading.profile', 'loading.account', 'loading.generate', 'loading.draftSave', 'loading.drafts']
  },
  {
    name: 'resume preview and print flow are present',
    file: 'client/src/components/ResumePreview.jsx',
    patterns: ['Print / Save PDF', 'window.print()']
  },
  {
    name: 'print CSS isolates the resume page',
    file: 'client/src/index.css',
    patterns: ['@media print', '.resume-page', 'visibility: visible']
  }
];

const failures = [];

for (const check of checks) {
  const source = read(check.file);
  const missing = check.patterns.filter((pattern) => !source.includes(pattern));
  if (missing.length) {
    failures.push(`${check.name}: missing ${missing.join(', ')} in ${check.file}`);
  }
}

if (failures.length) {
  console.error('Basic verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Basic verification passed (${checks.length} checks).`);
