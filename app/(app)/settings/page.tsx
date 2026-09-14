'use client';

import { Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/components/app-state';
import { useTheme } from '@/components/theme-provider';
import { useAuthUser } from '@/components/auth-user';

const appearanceOptions = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export default function SettingsPage() {
  const { budgeting, setBudgeting } = useAppState();
  const { appearance, setAppearance } = useTheme();
  const user = useAuthUser();
  const initial = user?.name.trim().charAt(0).toUpperCase() || '?';
  const [name, setName] = useState<string>();
  const [password, setPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const saveName = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name ?? user?.name ?? '' }),
    });
    if (response.ok) window.location.reload();
    else setAccountError('Your name could not be updated.');
  };

  const removeAccount = async () => {
    if (
      !window.confirm('Permanently delete your account and all financial data?')
    )
      return;
    const response = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (response.ok) window.location.assign('/signin');
    else
      setAccountError(
        (await response.json().catch(() => null))?.error?.message ??
          'Account deletion failed.',
      );
  };

  return (
    <div className="settings-layout">
      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h3>Personal account</h3>
            <p>A space for your everyday finances.</p>
          </div>
          <ShieldCheck size={21} />
        </div>
        <div className="account-details">
          <span className="avatar large">{initial}</span>
          <div>
            <h3>{user?.name ?? 'Your account'}</h3>
            <p>{user?.email ?? 'Loading…'}</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h4>Currency</h4>
            <p>All your entries and reports use Indian rupees.</p>
          </div>
          <strong>INR · ₹</strong>
          <small className="fixed-setting">Fixed in V1</small>
        </div>
        <div className="setting-row">
          <div>
            <h4>Reporting timezone</h4>
            <p>Your transaction dates stay as entered.</p>
          </div>
          <strong>Asia/Kolkata</strong>
          <small className="fixed-setting">Fixed in V1</small>
        </div>
      </section>

      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h3>Make it yours</h3>
            <p>A little flexibility for the way you track.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h4>Enable category budgeting</h4>
            <p>
              Set monthly expense limits and track your progress.
              <br />
              Turning this off keeps your saved budgets.
            </p>
          </div>
          <Switch
            aria-label="Enable category budgeting"
            checked={budgeting}
            onCheckedChange={(value) => void setBudgeting(value)}
          />
        </div>
        <div className="setting-row">
          <div>
            <h4>Appearance</h4>
            <p>Choose what feels comfortable.</p>
          </div>
          <div className="appearance-options">
            {appearanceOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                className={appearance === value ? 'selected' : ''}
                onClick={() => setAppearance(value)}
                aria-label={`${value} appearance`}
                aria-pressed={appearance === value}
              >
                <Icon size={17} />
                <span>{value}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h3>Account security</h3>
            <p>Manage your password and active session.</p>
          </div>
        </div>
        <div className="account-buttons">
          <Link className="secondary-action" href="/change-password">
            Change password
          </Link>
          <Link className="secondary-action" href="/api/account/export">
            Export my data
          </Link>
        </div>
        <form className="account-form" onSubmit={saveName}>
          <label>
            Display name
            <Input
              required
              maxLength={80}
              value={name ?? user?.name ?? ''}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="secondary-action" type="submit">
            Save name
          </button>
        </form>
        <div className="setting-row">
          <div>
            <h4>Sign-in email</h4>
            <p>{user?.email} · Fixed in V1 and cannot be changed.</p>
          </div>
        </div>
        <div className="danger-zone">
          <h4>Delete account</h4>
          <p>
            Permanently removes your account, transactions, categories, budgets,
            and sessions.
          </p>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="secondary-action danger-action"
            type="button"
            disabled={!password}
            onClick={() => void removeAccount()}
          >
            <Trash2 size={15} /> Delete account
          </button>
        </div>
        {accountError && (
          <p className="error" role="alert">
            {accountError}
          </p>
        )}
      </section>
    </div>
  );
}
