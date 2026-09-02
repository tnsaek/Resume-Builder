import { useState } from 'react';
import FormMessage from './FormMessage';

export default function LoginForm({ onAuth, onForgotPassword, onResetPassword, authMode, setAuthMode, resetToken, isLoading, message }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    onAuth({ email, password });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    onForgotPassword(email);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    onResetPassword({ token: resetToken, newPassword });
  };

  if (authMode === 'forgot') {
    return (
      <form className="auth-card" onSubmit={handleForgotSubmit}>
        <h2>Reset password</h2>
        <FormMessage message={message} />

        <label htmlFor="forgotEmail">Email</label>
        <input
          id="forgotEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <div className="auth-actions">
          <button type="submit" disabled={isLoading}>
            Send reset link
          </button>
          <button type="button" className="secondary" onClick={() => setAuthMode('login')} disabled={isLoading}>
            Back to sign in
          </button>
        </div>
      </form>
    );
  }

  if (authMode === 'reset') {
    return (
      <form className="auth-card" onSubmit={handleResetSubmit}>
        <h2>Choose new password</h2>
        <FormMessage message={message} />

        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter a new password"
          minLength={8}
          required
        />

        <label htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter the new password"
          minLength={8}
          required
        />

        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="field-error">Passwords do not match.</p>
        )}

        <div className="auth-actions">
          <button type="submit" disabled={isLoading || !resetToken || newPassword !== confirmPassword}>
            Reset password
          </button>
          <button type="button" className="secondary" onClick={() => setAuthMode('login')} disabled={isLoading}>
            Back to sign in
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h2>{authMode === 'register' ? 'Register' : 'Sign in'}</h2>
      <FormMessage message={message} />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter a password"
        required
      />

      <div className="auth-actions">
        <button type="submit" disabled={isLoading}>
          {authMode === 'register' ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
          disabled={isLoading}
        >
          {authMode === 'register' ? 'Already have an account? Sign in' : 'Create a new account'}
        </button>
      </div>

      {authMode === 'login' && (
        <button type="button" className="link-button" onClick={() => setAuthMode('forgot')} disabled={isLoading}>
          Forgot password?
        </button>
      )}
    </form>
  );
}
