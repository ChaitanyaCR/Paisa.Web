import { Leaf } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="brand">
          <span className="brand-symbol">
            <Leaf />
          </span>
          paisa<span className="brand-period">.</span>
        </div>
        <div>
          <span className="eyebrow">A LITTLE CLARITY. EVERY DAY.</span>
          <h1>
            Make room for
            <br />
            what matters.
          </h1>
          <p>
            Your income, your spending, your next step.
            <br />A simpler way to feel at home with your money.
          </p>
        </div>
        <span>Thoughtfully simple. Made for your everyday.</span>
      </div>
      {children}
    </div>
  );
}
