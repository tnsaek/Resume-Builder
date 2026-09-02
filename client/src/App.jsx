import React, { useCallback, useEffect, useState } from 'react';
import AccountPage from './components/AccountPage';
import GeneratePage from './components/GeneratePage';
import LoginForm from './components/LoginForm';
import ProfileForm from './components/ProfileForm';
import SavedDraftsList from './components/SavedDraftsList';
import { useApi } from './hooks/useApi';

const initialProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedinUrl: '',
  portfolioUrl: '',
  githubUrl: '',
  headline: '',
  summary: '',
  skills: [],
  tools: [],
  workHistory: [],
  education: [],
  certifications: [],
  projects: [],
  achievements: [],
  volunteerWork: [],
  languages: [],
  jobPreferences: {
    targetRoles: [],
    targetIndustries: [],
    preferredLocations: [],
    workModes: [],
    salaryExpectation: '',
    notes: ''
  },
  availability: '',
  workAuthorization: ''
};

const initialAccount = {
  email: '',
  profileImageUrl: ''
};

const hasProfileContent = (profile) =>
  Boolean(
    profile.fullName ||
      profile.email ||
      profile.headline ||
      profile.summary ||
      profile.skills.length ||
      profile.workHistory.length ||
      profile.education.length
  );

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
const SESSION_LAST_ACTIVITY_KEY = 'lastActivityAt';
const initialLoading = {
  auth: false,
  passwordReset: false,
  profile: false,
  account: false,
  password: false,
  generate: false,
  draftSave: false,
  drafts: false,
  draftOpen: false,
  draftRename: false,
  draftDelete: false
};

const makeMessage = (scope, type, text) => ({ scope, type, text });

const getStoredSessionToken = () => {
  const storedToken = localStorage.getItem('token') || '';
  if (!storedToken) return '';

  const lastActivityAt = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY) || 0);
  if (!lastActivityAt || Date.now() - lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
    return '';
  }

  return storedToken;
};

function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get('resetToken') || '';
  const [authMode, setAuthMode] = useState(initialResetToken ? 'reset' : 'login');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [token, setToken] = useState(getStoredSessionToken);
  const [account, setAccount] = useState(initialAccount);
  const [profile, setProfile] = useState(initialProfile);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [activePage, setActivePage] = useState('profile');
  const [drafts, setDrafts] = useState([]);
  const [openedDraft, setOpenedDraft] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(initialLoading);

  const isAnyLoading = Object.values(loading).some(Boolean);

  const { apiRequest } = useApi(token);

  const setLoadingState = (key, value) => {
    setLoading((current) => ({ ...current, [key]: value }));
  };

  const clearMessage = () => {
    setMessage(null);
  };

  const getMessageFor = (...scopes) => (message && scopes.includes(message.scope) ? message : null);

  useEffect(() => {
    if (token) {
      loadProfile();
      loadAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    let idleTimerId;
    const logoutForInactivity = () => {
      saveToken('');
      setAccount(initialAccount);
      setProfile(initialProfile);
      setIsProfileSaved(false);
      setDrafts([]);
      setOpenedDraft(null);
      setActivePage('profile');
      setMessage(makeMessage('auth', 'error', 'Your session expired after inactivity. Sign in again to continue.'));
    };

    const resetIdleTimer = () => {
      localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
      window.clearTimeout(idleTimerId);
      idleTimerId = window.setTimeout(logoutForInactivity, SESSION_IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();
    SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      window.clearTimeout(idleTimerId);
      SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
      localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
    }
  };

  const handleAuth = async ({ email, password }) => {
    clearMessage();
    setLoadingState('auth', true);

    try {
      const path = authMode === 'register' ? '/api/register' : '/api/login';
      const data = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      saveToken(data.token);
      setAccount({
        email: data.user?.email || email,
        profileImageUrl: data.user?.profileImageUrl || ''
      });
      setMessage(makeMessage('auth', 'success', `Signed in as ${data.user.email}.`));
    } catch (error) {
      setMessage(makeMessage('auth', 'error', `Sign-in failed: ${error.message}`));
    } finally {
      setLoadingState('auth', false);
    }
  };

  const handleForgotPassword = async (email) => {
    clearMessage();
    setLoadingState('passwordReset', true);

    try {
      const data = await apiRequest('/api/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(makeMessage('auth', 'success', data.message || 'If that email is registered, a reset link has been sent.'));
      setAuthMode('login');
    } catch (error) {
      setMessage(makeMessage('auth', 'error', `Password reset request failed: ${error.message}`));
    } finally {
      setLoadingState('passwordReset', false);
    }
  };

  const handleResetPassword = async ({ token, newPassword }) => {
    clearMessage();
    setLoadingState('passwordReset', true);

    try {
      await apiRequest('/api/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      setResetToken('');
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthMode('login');
      setMessage(makeMessage('auth', 'success', 'Password reset. Sign in with your new password.'));
    } catch (error) {
      setMessage(makeMessage('auth', 'error', `Password reset failed: ${error.message}`));
    } finally {
      setLoadingState('passwordReset', false);
    }
  };

  const loadProfile = async () => {
    setLoadingState('profile', true);
    clearMessage();

    try {
      const data = await apiRequest('/api/profile');
      const jobPreferences = data.job_preferences || {};
      const loadedProfile = {
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        linkedinUrl: data.linkedin_url || '',
        portfolioUrl: data.portfolio_url || '',
        githubUrl: data.github_url || '',
        headline: data.headline || '',
        summary: data.summary || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        tools: Array.isArray(data.tools) ? data.tools : [],
        workHistory: Array.isArray(data.work_history) ? data.work_history : [],
        education: Array.isArray(data.education) ? data.education : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        achievements: Array.isArray(data.achievements) ? data.achievements : [],
        volunteerWork: Array.isArray(data.volunteer_work) ? data.volunteer_work : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        jobPreferences: {
          targetRoles: Array.isArray(jobPreferences.targetRoles) ? jobPreferences.targetRoles : [],
          targetIndustries: Array.isArray(jobPreferences.targetIndustries) ? jobPreferences.targetIndustries : [],
          preferredLocations: Array.isArray(jobPreferences.preferredLocations) ? jobPreferences.preferredLocations : [],
          workModes: Array.isArray(jobPreferences.workModes) ? jobPreferences.workModes : [],
          salaryExpectation: jobPreferences.salaryExpectation || '',
          notes: jobPreferences.notes || ''
        },
        availability: data.availability || '',
        workAuthorization: data.work_authorization || ''
      };

      setProfile(loadedProfile);
      setIsProfileSaved(hasProfileContent(loadedProfile));
    } catch (error) {
      setMessage(makeMessage('profile', 'error', `Could not load your profile: ${error.message}`));
      saveToken('');
    } finally {
      setLoadingState('profile', false);
    }
  };

  const loadAccount = async () => {
    setLoadingState('account', true);
    clearMessage();

    try {
      const data = await apiRequest('/api/account');
      setAccount({
        email: data.user?.email || '',
        profileImageUrl: data.user?.profileImageUrl || ''
      });
    } catch (error) {
      setMessage(makeMessage('account', 'error', `Could not load account details: ${error.message}`));
      saveToken('');
    } finally {
      setLoadingState('account', false);
    }
  };

  const handleSaveAccount = async ({ email, profileImageUrl }) => {
    setLoadingState('account', true);
    clearMessage();

    try {
      const data = await apiRequest('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ email, profileImageUrl })
      });
      saveToken(data.token);
      setAccount({
        email: data.user?.email || email,
        profileImageUrl: data.user?.profileImageUrl || ''
      });
      setMessage(makeMessage('account', 'success', 'Account saved. Your email and profile image were updated.'));
      return true;
    } catch (error) {
      setMessage(makeMessage('account', 'error', `Account update failed: ${error.message}`));
      return false;
    } finally {
      setLoadingState('account', false);
    }
  };

  const handleSaveProfile = async () => {
    setLoadingState('profile', true);
    clearMessage();

    try {
      await apiRequest('/api/profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
      setIsProfileSaved(true);
      setActivePage('generate');
      setMessage(makeMessage('profile', 'success', 'Profile saved. You can now paste a job post and generate a draft.'));
    } catch (error) {
      setMessage(makeMessage('profile', 'error', `Profile save failed: ${error.message}`));
    } finally {
      setLoadingState('profile', false);
    }
  };

  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    setLoadingState('password', true);
    clearMessage();

    try {
      await apiRequest('/api/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setMessage(makeMessage('password', 'success', 'Password changed. Use the new password the next time you sign in.'));
      return true;
    } catch (error) {
      setMessage(makeMessage('password', 'error', `Password change failed: ${error.message}`));
      return false;
    } finally {
      setLoadingState('password', false);
    }
  };

  const handleGenerate = async (jobPost) => {
    if (!isProfileSaved) {
      setActivePage('profile');
      setMessage(makeMessage('profile', 'error', 'Save your profile before generating a resume.'));
      return null;
    }

    setLoadingState('generate', true);
    clearMessage();

    try {
      const data = await apiRequest('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ jobPost })
      });
      setMessage(makeMessage('generate', 'success', 'Draft generated. Review the resume points and cover letter before saving.'));
      return data;
    } catch (error) {
      setMessage(makeMessage('generate', 'error', `Draft generation failed: ${error.message}`));
      return null;
    } finally {
      setLoadingState('generate', false);
    }
  };

  const loadDrafts = useCallback(async () => {
    setLoadingState('drafts', true);
    clearMessage();

    try {
      const data = await apiRequest('/api/drafts');
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (error) {
      setMessage(makeMessage('saved', 'error', `Could not refresh saved drafts: ${error.message}`));
    } finally {
      setLoadingState('drafts', false);
    }
  }, [apiRequest]);

  const handleSaveDraft = async ({ id, title, jobPost, resumePoints, coverLetter }) => {
    setLoadingState('draftSave', true);
    clearMessage();

    try {
      const data = await apiRequest(id ? `/api/drafts/${id}` : '/api/drafts', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({ title, jobPost, resumePoints, coverLetter })
      });
      setMessage(makeMessage('draftSave', 'success', 'Draft saved. Your latest edits are stored in Saved.'));
      loadDrafts();
      return data.draft;
    } catch (error) {
      setMessage(makeMessage('draftSave', 'error', `Draft save failed: ${error.message}`));
      return null;
    } finally {
      setLoadingState('draftSave', false);
    }
  };

  const handleOpenDraft = async (draftId) => {
    setLoadingState('draftOpen', true);
    clearMessage();

    try {
      const data = await apiRequest(`/api/drafts/${draftId}`);
      setOpenedDraft(data.draft);
      setActivePage('generate');
      setMessage(makeMessage('generate', 'success', 'Draft opened. You can edit or save changes from here.'));
    } catch (error) {
      setMessage(makeMessage('saved', 'error', `Could not open draft: ${error.message}`));
    } finally {
      setLoadingState('draftOpen', false);
    }
  };

  const handleRenameDraft = async (draftId, title) => {
    setLoadingState('draftRename', true);
    clearMessage();

    try {
      const data = await apiRequest(`/api/drafts/${draftId}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ title })
      });
      setDrafts((current) =>
        current.map((draft) => (draft.id === draftId ? { ...draft, ...data.draft } : draft))
      );
      setOpenedDraft((current) => (current?.id === draftId ? { ...current, title: data.draft.title } : current));
      setMessage(makeMessage('draftRename', 'success', 'Draft renamed.'));
      return data.draft;
    } catch (error) {
      setMessage(makeMessage('draftRename', 'error', `Rename failed: ${error.message}`));
      return null;
    } finally {
      setLoadingState('draftRename', false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    setLoadingState('draftDelete', true);
    clearMessage();

    try {
      await apiRequest(`/api/drafts/${draftId}`, { method: 'DELETE' });
      setDrafts((current) => current.filter((draft) => draft.id !== draftId));
      setOpenedDraft((current) => (current?.id === draftId ? null : current));
      setMessage(makeMessage('saved', 'success', 'Draft deleted.'));
      return true;
    } catch (error) {
      setMessage(makeMessage('saved', 'error', `Delete failed: ${error.message}`));
      return false;
    } finally {
      setLoadingState('draftDelete', false);
    }
  };

  const handleLogout = () => {
    saveToken('');
    setAccount(initialAccount);
    setProfile(initialProfile);
    setIsProfileSaved(false);
    setDrafts([]);
    setOpenedDraft(null);
    setLoading(initialLoading);
    setActivePage('profile');
    setMessage(makeMessage('auth', 'success', 'Logged out. Sign in again when you are ready.'));
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Resume And Cover Letter Builder</h1>
      </header>

      <main>
        {token ? (
          <>
            <nav className="app-nav" aria-label="Primary">
              <button type="button" className={activePage === 'profile' ? '' : 'secondary'} onClick={() => setActivePage('profile')}>
                Profile
              </button>
              <button
                type="button"
                className={activePage === 'generate' ? '' : 'secondary'}
                onClick={() => {
                  if (!isProfileSaved) {
                    setActivePage('profile');
                    setMessage(makeMessage('profile', 'error', 'Save your profile before generating a resume.'));
                    return;
                  }
                  setActivePage('generate');
                }}
              >
                Generate
              </button>
              <button type="button" className={activePage === 'saved' ? '' : 'secondary'} onClick={() => setActivePage('saved')}>
                Saved
              </button>
              <button type="button" className={activePage === 'account' ? '' : 'secondary'} onClick={() => setActivePage('account')}>
                Account
              </button>
              <button type="button" className="secondary" onClick={handleLogout} disabled={isAnyLoading}>
                Logout
              </button>
            </nav>

            {activePage === 'profile' ? (
              <ProfileForm
                profile={profile}
                setProfile={setProfile}
                onSave={handleSaveProfile}
                isLoading={loading.profile}
                message={getMessageFor('profile')}
              />
            ) : activePage === 'account' ? (
              <AccountPage
                account={account}
                onSaveAccount={handleSaveAccount}
                onChangePassword={handleChangePassword}
                isAccountLoading={loading.account}
                isPasswordLoading={loading.password}
                accountMessage={getMessageFor('account')}
                passwordMessage={getMessageFor('password')}
              />
            ) : activePage === 'saved' ? (
              <SavedDraftsList
                drafts={drafts}
                onLoadDrafts={loadDrafts}
                onOpenDraft={handleOpenDraft}
                onRenameDraft={handleRenameDraft}
                onDeleteDraft={handleDeleteDraft}
                isLoadingDrafts={loading.drafts}
                isOpeningDraft={loading.draftOpen}
                isRenamingDraft={loading.draftRename}
                isDeletingDraft={loading.draftDelete}
                message={getMessageFor('saved')}
                renameMessage={getMessageFor('draftRename')}
              />
            ) : (
              <GeneratePage
                openedDraft={openedDraft}
                profile={profile}
                canGenerate={isProfileSaved}
                onGenerate={handleGenerate}
                onSaveDraft={handleSaveDraft}
                isGenerating={loading.generate}
                isSavingDraft={loading.draftSave}
                generateMessage={getMessageFor('generate', 'profile')}
                saveMessage={getMessageFor('draftSave')}
              />
            )}
          </>
        ) : (
          <LoginForm
            onAuth={handleAuth}
            onForgotPassword={handleForgotPassword}
            onResetPassword={handleResetPassword}
            authMode={authMode}
            setAuthMode={setAuthMode}
            resetToken={resetToken}
            isLoading={loading.auth || loading.passwordReset}
            message={getMessageFor('auth')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
