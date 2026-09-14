'use client';

import { Button } from '@fluentui/react-components';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function ChangePasswordPage() {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel settings-card">
      <div className="panel-heading">
        <div>
          <h3>Change password</h3>
          <p>Use at least eight characters.</p>
        </div>
      </div>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setNotice('');
          const form = new FormData(event.currentTarget);
          const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              currentPassword: form.get('currentPassword'),
              newPassword: form.get('newPassword'),
            }),
          }).catch(() => null);
          if (response?.ok) window.location.assign('/overview');
          else {
            const body = await response?.json().catch(() => null);
            setNotice(body?.error?.message ?? 'Unable to change the password.');
            setBusy(false);
          }
        }}
      >
        <label>
          Current or temporary password
          <Input
            required
            type="password"
            name="currentPassword"
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <Input
            required
            minLength={8}
            maxLength={128}
            type="password"
            name="newPassword"
            autoComplete="new-password"
          />
        </label>
        <Button appearance="primary" type="submit" disabled={busy}>
          Save new password
        </Button>
        {notice && (
          <p className="info-note" role="alert">
            {notice}
          </p>
        )}
      </form>
    </section>
  );
}
