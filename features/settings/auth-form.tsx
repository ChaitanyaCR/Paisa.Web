'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { ArrowRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export type AuthMode = 'signin' | 'signup' | 'reset';

const copy: Record<AuthMode, { title: string; lead: string; submit: string }> = {
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
    title: 'Let’s get you back in.',
    lead: 'Enter your email to reset your password.',
    submit: 'Send reset link',
  },
};

/**
 * Layout only. Phase 3 replaces the submit handler with a real request — the
 * markup here is what it will render against.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const [notice, setNotice] = useState('');
  const { title, lead, submit } = copy[mode];

  return (
    <div className="auth-form">
      <Link className="text-link" href="/overview">
        <ChevronLeft size={16} /> Back to review
      </Link>
      <h2>{title}</h2>
      <p>{lead}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setNotice('This is a layout preview. No account was created and no email was sent.');
        }}
      >
        {mode === 'signup' && (
          <label>
            Your name
            <Input required placeholder="e.g. Chaitanya" />
          </label>
        )}
        <label>
          Email address
          <Input required type="email" placeholder="you@example.com" />
        </label>
        {mode !== 'reset' && (
          <label>
            Password
            <Input
              required
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
        )}
        {mode === 'signin' && (
          <Link className="text-link" href="/reset">
            Forgot password?
          </Link>
        )}
        <FluentButton appearance="primary" type="submit">
          {submit} <ArrowRight size={16} />
        </FluentButton>
      </form>
      {notice && (
        <p className="info-note" role="status">
          {notice}
        </p>
      )}
      <p>
        {mode === 'signup' ? 'Already have an account?' : 'New to Paisa?'}{' '}
        <Link className="text-link" href={mode === 'signup' ? '/signin' : '/signup'}>
          {mode === 'signup' ? 'Sign in' : 'Create account'}
        </Link>
      </p>
      <div className="preview-note">
        <ShieldCheck size={16} /> Screen preview · please use sample details
      </div>
    </div>
  );
}
