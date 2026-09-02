import { useEffect, useState } from 'react';
import FormMessage from './FormMessage';

export default function AccountPage({ account, onSaveAccount, onChangePassword, isAccountLoading, isPasswordLoading, accountMessage, passwordMessage }) {
  const [accountForm, setAccountForm] = useState({
    email: account.email || '',
    profileImageUrl: account.profileImageUrl || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setAccountForm({
      email: account.email || '',
      profileImageUrl: account.profileImageUrl || ''
    });
  }, [account]);

  const updateAccountField = (field, value) => {
    setAccountForm((current) => ({ ...current, [field]: value }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    onSaveAccount(accountForm);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return;

    const changed = await onChangePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });

    if (changed) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  return (
    <section className="account-card">
      <div className="profile-header">
        <h2>Account</h2>
      </div>

      <form className="form-section first-section" onSubmit={handleAccountSubmit}>
        <h3>Identity</h3>
        <FormMessage message={accountMessage} />
        <div className="account-identity-grid">
          <div className="avatar-preview" aria-label="Profile image preview">
            {accountForm.profileImageUrl ? (
              <img src={accountForm.profileImageUrl} alt="" />
            ) : (
              <span>{(accountForm.email || '?').slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="field-grid">
            <div>
              <label htmlFor="accountEmail">Email</label>
              <input
                id="accountEmail"
                type="email"
                value={accountForm.email}
                onChange={(event) => updateAccountField('email', event.target.value)}
                placeholder="you@example.com"
                disabled={isAccountLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="profileImageUrl">Profile image URL</label>
              <input
                id="profileImageUrl"
                type="url"
                value={accountForm.profileImageUrl}
                onChange={(event) => updateAccountField('profileImageUrl', event.target.value)}
                placeholder="https://example.com/photo.jpg"
                disabled={isAccountLoading}
              />
            </div>
          </div>
        </div>

        <div className="controls">
          <button type="submit" disabled={isAccountLoading || !accountForm.email.trim()}>
            {isAccountLoading ? 'Saving...' : 'Save account'}
          </button>
        </div>
      </form>

      <form className="form-section" onSubmit={handlePasswordSubmit}>
        <h3>Security</h3>
        <FormMessage message={passwordMessage} />
        <div className="field-grid">
          <div>
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              placeholder="Current password"
              disabled={isPasswordLoading}
              required
            />
          </div>
          <div>
            <label htmlFor="accountNewPassword">New password</label>
            <input
              id="accountNewPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordField('newPassword', event.target.value)}
              placeholder="New password"
              minLength={8}
              disabled={isPasswordLoading}
              required
            />
          </div>
          <div>
            <label htmlFor="accountConfirmPassword">Confirm new password</label>
            <input
              id="accountConfirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
              placeholder="Re-enter new password"
              minLength={8}
              disabled={isPasswordLoading}
              required
            />
          </div>
        </div>

        {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
          <p className="field-error">Passwords do not match.</p>
        )}

        <div className="controls">
          <button
            type="submit"
            disabled={
              isPasswordLoading ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword
            }
          >
            {isPasswordLoading ? 'Changing...' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  );
}
