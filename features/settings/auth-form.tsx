'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export type AuthMode = 'signin' | 'signup' | 'reset';

const copy: Record<AuthMode, { title: string; lead: string; submit: string }> =
  {
    signin: {
      title: 'Welcome back.',
      lead: 'A clearer picture of your money awaits.',
      submit: 'Sign in',
    },
    signup: {
      title: 'Your fresh start.',
      lead: 'Create your personal space for money.',
      submit: 'Create account',
    },
    reset: {
      title: 'Password help.',
      lead: 'Contact an administrator to receive a temporary password.',
      submit: '',
    },
  };

/**
 * Sign-in and registration use the local API. V1 password resets are admin-only.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { title, lead, submit } = copy[mode];

  return (
    <div className="auth-form">
      <h2>{title}</h2>
      <p>{lead}</p>
      {mode === 'reset' ? (
        <div className="preview-note">
          <ShieldCheck size={16} /> For your security, only an administrator can
          reset your password.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setNotice('');
            const form = new FormData(e.currentTarget);
            const response = await fetch(`/api/auth/${mode}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                name: form.get('name'),
                email: form.get('email'),
                password: form.get('password'),
                consent: form.get('consent') === 'on',
              }),
            }).catch(() => null);
            if (response?.ok) window.location.assign('/overview');
            else {
              const body = await response?.json().catch(() => null);
              setNotice(
                body?.error?.message ?? 'Unable to continue. Please try again.',
              );
              setBusy(false);
            }
          }}
        >
          {mode === 'signup' && (
            <label>
              Your name
              <Input required name="name" autoComplete="name" />
            </label>
          )}
          <label>
            Email address
            <Input required name="email" type="email" autoComplete="email" />
          </label>
          <label>
            Password
            <Input
              required
              name="password"
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete={
                mode === 'signup' ? 'new-password' : 'current-password'
              }
            />
          </label>
          {mode === 'signin' && (
            <Link className="text-link" href="/reset">
              Forgot password?
            </Link>
          )}
          {mode === 'signup' && (
            <label className="consent-control">
              <input required name="consent" type="checkbox" />
              <span>
                I agree to the use of my data to provide Paisa, as described in
                the{' '}
                <Link className="text-link" href="/privacy">
                  privacy notice
                </Link>
                .
              </span>
            </label>
          )}
          <FluentButton appearance="primary" type="submit" disabled={busy}>
            {submit} <ArrowRight size={16} />
          </FluentButton>
        </form>
      )}
      {notice && (
        <p className="info-note" role="status">
          {notice}
        </p>
      )}
      <p>
        {mode === 'signup' ? 'Already have an account?' : 'New to Paisa?'}{' '}
        <Link
          className="text-link"
          href={mode === 'signup' ? '/signin' : '/signup'}
        >
          {mode === 'signup' ? 'Sign in' : 'Create account'}
        </Link>
      </p>
    </div>
  );
}
