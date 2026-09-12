'use client';

import { Button } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (response) => {
        if (!response.ok) throw new Error('Administrator access is required.');
        setUsers((await response.json()).users);
      })
      .catch((error) => setNotice(error.message));
  }, []);
  return (
    <section className="panel settings-card">
      <div className="panel-heading">
        <div>
          <h3>User administration</h3>
          <p>Issue a temporary password when a user cannot sign in.</p>
        </div>
      </div>
      {users.map((user) => (
        <form
          key={user.id}
          className="setting-row"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const response = await fetch(
              `/api/admin/users/${user.id}/reset-password`,
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  temporaryPassword: form.get('temporaryPassword'),
                }),
              },
            );
            if (response.ok) {
              event.currentTarget.reset();
              setNotice(
                `Temporary password assigned to ${user.name}. Existing sessions were ended.`,
              );
            } else
              setNotice(
                (await response.json()).error?.message ?? 'Reset failed.',
              );
          }}
        >
          <div>
            <h4>
              {user.name} {user.role === 'admin' ? '(Admin)' : ''}
            </h4>
            <p>
              {user.email}
              {user.mustChangePassword ? ' · Password change required' : ''}
            </p>
          </div>
          <div className="account-buttons">
            <Input
              required
              minLength={8}
              maxLength={128}
              type="password"
              name="temporaryPassword"
              placeholder="Temporary password"
              autoComplete="new-password"
            />
            <Button type="submit">Reset password</Button>
          </div>
        </form>
      ))}
      {notice && (
        <p className="info-note" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
