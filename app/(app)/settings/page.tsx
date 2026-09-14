'use client';

import { Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useAppState } from '@/components/app-state';
import { useTheme } from '@/components/theme-provider';

const appearanceOptions = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export default function SettingsPage() {
  const { budgeting, setBudgeting, notify } = useAppState();
  const { appearance, setAppearance } = useTheme();

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
          <span className="avatar large">C</span>
          <div>
            <h3>Chaitanya</h3>
            <p>
              chaitanya@example.com <span className="small-tag">Sample account</span>
            </p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h4>Currency</h4>
            <p>All your entries and reports use Indian rupees.</p>
          </div>
          <strong>INR · ₹</strong>
        </div>
        <div className="setting-row">
          <div>
            <h4>Reporting timezone</h4>
            <p>Your transaction dates stay as entered.</p>
          </div>
          <strong>Asia/Kolkata</strong>
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
            onCheckedChange={(value) => {
              setBudgeting(value);
              notify(value ? 'Category budgeting enabled' : 'Category budgeting turned off');
            }}
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
            <h3>Account screen previews</h3>
            <p>Review the sign-in, registration, and password reset layouts.</p>
          </div>
        </div>
        <div className="account-buttons">
          <Link className="secondary-action" href="/signin">
            Preview sign in
          </Link>
          <Link className="secondary-action" href="/signup">
            Preview registration
          </Link>
          <Link className="secondary-action" href="/reset">
            Preview password reset
          </Link>
        </div>
        <p className="preview-note">
          This review uses sample data in memory. Changes reset when the page reloads.
          Authentication and cross-device sync are not connected yet.
        </p>
      </section>
    </div>
  );
}
