import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <h1>Paisa privacy notice</h1>
      <p>Version 2026-09-v1 · effective 14 September 2026</p>
      <h2>Why we process data</h2>
      <p>
        Paisa stores your name, email, settings, categories, transactions, and
        budgets solely to provide your private budgeting account.
      </p>
      <h2>Storage and retention</h2>
      <p>
        Your data is stored on the India-resident application host. It is
        retained until you delete your account; deletion removes the account and
        related financial records.
      </p>
      <h2>Your controls</h2>
      <p>
        You can export your data from Settings, change your display name or
        password, and permanently delete your account. V1 does not use
        advertising, bank connections, or external email services.
      </p>
      <h2>Before launch</h2>
      <p>
        The operator must publish a grievance contact, retention and backup
        policy, and breach-response process before offering Paisa publicly.
      </p>
      <Link href="/signup">Back to sign up</Link>
    </main>
  );
}
