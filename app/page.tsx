'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Button as FluentButton,
} from '@fluentui/react-components';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Tags,
  Settings,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Search,
  Pencil,
  Trash2,
  ShoppingBag,
  House,
  Utensils,
  Car,
  Heart,
  BriefcaseBusiness,
  Laptop,
  Leaf,
  ShieldCheck,
  ArrowRight,
  Check,
  Sun,
  Moon,
  Monitor,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Kind = 'income' | 'expense';
type Category = {
  id: string;
  name: string;
  type: Kind;
  color: string;
  archived?: boolean;
};
type Transaction = {
  id: string;
  type: Kind;
  amount: number;
  date: string;
  category: string;
  notes: string;
};
const initialCategories: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#53846e' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#799582' },
  { id: 'home', name: 'Rent & bills', type: 'expense', color: '#427c65' },
  { id: 'food', name: 'Food & groceries', type: 'expense', color: '#a1b88d' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#e2b483' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#9ca8bb' },
  {
    id: 'health',
    name: 'Health & wellness',
    type: 'expense',
    color: '#bb9aa5',
  },
];
const categoryColors = [
  '#3565c9',
  '#7855bc',
  '#b65e88',
  '#bb742c',
  '#328b91',
  '#61728c',
  '#458259',
  '#ba5555',
];
const icons: Record<string, typeof Wallet> = {
  salary: BriefcaseBusiness,
  freelance: Laptop,
  home: House,
  food: Utensils,
  shopping: ShoppingBag,
  transport: Car,
  health: Heart,
};
const seeds = [
  ['salary', 85000, 1, 'Monthly salary'],
  ['home', 18000, 2, 'September rent'],
  ['food', 2450, 3, 'Weekly groceries'],
  ['transport', 1200, 4, 'Fuel refill'],
  ['freelance', 12500, 5, 'Website project'],
  ['shopping', 3499, 6, 'A little wardrobe refresh'],
  ['food', 850, 7, 'Dinner with friends'],
  ['health', 1800, 8, 'Gym membership'],
  ['food', 1620, 9, 'Groceries & essentials'],
  ['transport', 340, 10, 'Cab to office'],
  ['food', 420, 11, 'Coffee & lunch'],
] as const;
const initialTransactions: Transaction[] = [7, 8, 9].flatMap((month) =>
  seeds.map(([category, amount, day, notes], i) => ({
    id: `${month}-${i}`,
    category,
    amount: Math.round(
      amount * (month === 9 ? 1 : month === 8 ? 0.91 : 0.86) * 100,
    ),
    date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    notes: category === 'home' ? 'Monthly rent' : notes,
    type:
      category === 'salary' || category === 'freelance' ? 'income' : 'expense',
  })),
);
const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
const monthLabel = (month: string) =>
  new Date(`${month}-02`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
const pages = [
  ['Overview', LayoutDashboard],
  ['Transactions', ArrowLeftRight],
  ['Analytics', ChartNoAxesCombined],
  ['Budgets', Wallet],
  ['Categories', Tags],
  ['Settings', Settings],
] as const;

export default function Home() {
  const [page, setPage] = useState<string>('Overview');
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [month, setMonth] = useState('2026-09');
  const [budgeting, setBudgeting] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, number>>({
    '2026-09:home': 2000000,
    '2026-09:food': 1000000,
    '2026-09:shopping': 500000,
    '2026-09:transport': 300000,
    '2026-09:health': 200000,
  });
  const [appearance, setAppearance] = useState('system');
  const [systemDark, setSystemDark] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('2026-09-01');
  const [to, setTo] = useState('2026-09-30');
  const [modal, setModal] = useState<
    'transaction' | 'category' | 'budget' | 'delete' | null
  >(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [entry, setEntry] = useState({
    type: 'expense' as Kind,
    amount: '',
    date: '2026-09-11',
    category: 'food',
    notes: '',
  });
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3565c9');
  const [categoryType, setCategoryType] = useState<Kind>('expense');
  const [budgetCategory, setBudgetCategory] = useState('food');
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [auth, setAuth] = useState<null | 'signin' | 'signup' | 'reset'>(null);
  const [authNotice, setAuthNotice] = useState('');
  const dark = appearance === 'dark' || (appearance === 'system' && systemDark);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const notify = (message: string) => setNotice(message);
  const getCat = (id: string) => categories.find((c) => c.id === id)!;
  const selectedEntryCategory = categories.find(
    (category) => category.id === entry.category,
  );
  const monthly = transactions.filter((t) => t.date.startsWith(month));
  const filtered = useMemo(
    () =>
      transactions
        .filter((t) => {
          const inPeriod =
            period === 'year'
              ? t.date.startsWith(month.slice(0, 4))
              : period === 'custom'
                ? t.date >= from && t.date <= to
                : t.date.startsWith(month);
          const category = categories.find((c) => c.id === t.category);
          return (
            inPeriod &&
            (typeFilter === 'all' || t.type === typeFilter) &&
            (catFilter === 'all' || t.category === catFilter) &&
            `${t.notes} ${category?.name}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [
      transactions,
      period,
      month,
      from,
      to,
      typeFilter,
      catFilter,
      query,
      categories,
    ],
  );
  const active =
    page === 'Analytics' || page === 'Transactions' ? filtered : monthly;
  const income = active
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = active
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = categories.filter((c) => c.type === 'expense');
  const breakdown = expenses
    .map((c) => ({
      ...c,
      total: active
        .filter((t) => t.category === c.id)
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const categorySpend = (id: string) =>
    monthly
      .filter((t) => t.category === id)
      .reduce((sum, t) => sum + t.amount, 0);
  const moveMonth = (direction: number) => {
    const date = new Date(`${month}-02`);
    date.setMonth(date.getMonth() + direction);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
  };
  const navigate = (next: string) => {
    setPage(next);
    setQuery('');
    setCatFilter('all');
    setTypeFilter('all');
    setPeriod('month');
  };
  const openTransaction = (transaction?: Transaction) => {
    setEditing(transaction?.id || null);
    setEntry(
      transaction
        ? { ...transaction, amount: String(transaction.amount / 100) }
        : {
            type: 'expense',
            amount: '',
            date: `${month}-11`,
            category:
              categories.find((c) => c.type === 'expense' && !c.archived)?.id ||
              '',
            notes: '',
          },
    );
    setError('');
    setModal('transaction');
  };
  const saveTransaction = (event: React.SyntheticEvent) => {
    event.preventDefault();
    const amount = Number(entry.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !entry.category ||
      !entry.date
    ) {
      setError('Add a valid amount, date, and category before saving.');
      return;
    }
    const transaction = {
      ...entry,
      id: editing || crypto.randomUUID(),
      amount: Math.round(amount * 100),
    };
    setTransactions((old) =>
      editing
        ? old.map((t) => (t.id === editing ? transaction : t))
        : [...old, transaction],
    );
    setModal(null);
    notify(editing ? 'Transaction updated' : 'Transaction added');
  };
  const drillDown = (id: string) => {
    setPage('Transactions');
    setCatFilter(id);
    setQuery('');
  };
  const categoryIcon = (id: string) => {
    const Icon = icons[id] || Tags;
    const c = getCat(id);
    return (
      <span
        className="category-icon"
        style={{ background: `${c?.color}19`, color: c?.color }}
      >
        <Icon size={19} />
      </span>
    );
  };
  const action = (
    text: string,
    handler: () => void,
    secondary = false,
    destructive = false,
  ) => (
    <FluentButton
      className={
        destructive
          ? 'destructive-action'
          : secondary
            ? 'secondary-action'
            : 'primary-action'
      }
      appearance={secondary ? 'secondary' : 'primary'}
      onClick={handler}
    >
      {text}
    </FluentButton>
  );
  const transactionRows = (list: Transaction[]) => (
    <div className="transaction-list">
      <div className="table-head">
        <span>TRANSACTION</span>
        <span>CATEGORY</span>
        <span>DATE</span>
        <span>AMOUNT</span>
        <span />
      </div>
      {list.length ? (
        list.map((t) => (
          <div className="transaction-row" key={t.id}>
            <div className="transaction-name">
              {categoryIcon(t.category)}
              <div>
                <strong>{t.notes || getCat(t.category)?.name}</strong>
                <small>
                  {t.type === 'income' ? 'Income' : 'Expense'} · Manual entry
                </small>
                <span
                  className="category-pill mobile-category-badge"
                  style={{
                    background: `${getCat(t.category)?.color}20`,
                    borderColor: `${getCat(t.category)?.color}55`,
                  }}
                >
                  <i style={{ background: getCat(t.category)?.color }} />
                  {getCat(t.category)?.name}
                </span>
              </div>
            </div>
            <span
              className="category-pill"
              style={{
                background: `${getCat(t.category)?.color}20`,
                borderColor: `${getCat(t.category)?.color}55`,
              }}
            >
              <i style={{ background: getCat(t.category)?.color }} />
              {getCat(t.category)?.name}
            </span>
            <span className="transaction-date">
              {new Date(`${t.date}T12:00:00`).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <strong className={`amount ${t.type}`}>
              {t.type === 'income' ? '+' : '−'}
              {money(t.amount)}
            </strong>
            <button
              className="icon-button"
              aria-label={`Edit ${t.notes}`}
              onClick={() => openTransaction(t)}
            >
              <Pencil size={15} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty">
          <Search />
          <h3>No transactions found</h3>
          <p>Try another period or add your first entry.</p>
        </div>
      )}
    </div>
  );
  const filters = (
    <div className="filter-bar">
      <div className="search">
        <Search size={17} />
        <input
          aria-label="Search transactions"
          placeholder="Search transactions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <select
        aria-label="Transaction type"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      >
        <option value="all">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expenses</option>
      </select>
      <select
        aria-label="Category filter"
        value={catFilter}
        onChange={(e) => setCatFilter(e.target.value)}
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Reporting period"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
      >
        <option value="month">Monthly</option>
        <option value="year">Yearly</option>
        <option value="custom">Custom dates</option>
      </select>
      {period === 'custom' && (
        <>
          <input
            aria-label="Start date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            aria-label="End date"
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </>
      )}
    </div>
  );
  const stats = (
    <div className="stats-grid">
      <article className="stat-card">
        <div className="stat-top">
          Total income
          <span className="stat-icon green">
            <ArrowDownLeft size={20} />
          </span>
        </div>
        <h2>{money(income)}</h2>
        <span className="stat-caption">
          <span className="dot green-dot" />
          Money coming in
        </span>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          Total expenses
          <span className="stat-icon peach">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <h2>{money(expense)}</h2>
        <span className="stat-caption">
          <span className="dot peach-dot" />
          {active.filter((t) => t.type === 'expense').length} expense entries
        </span>
      </article>
      <article className="stat-card savings">
        <div className="stat-top">
          Net savings
          <span className="stat-icon">
            <Wallet size={20} />
          </span>
        </div>
        <h2>{money(income - expense)}</h2>
        <span className="stat-caption">
          {income > 0
            ? `${Math.round(((income - expense) / income) * 100)}% of your income saved`
            : 'Income minus expenses'}{' '}
          <Leaf size={14} />
        </span>
      </article>
    </div>
  );
  const reportStart = period === 'custom' ? from : `${month}-01`;
  const reportEnd =
    period === 'custom'
      ? to
      : `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()}`;
  const reportDays = Math.max(
    1,
    Math.round((Date.parse(reportEnd) - Date.parse(reportStart)) / 86400000) +
      1,
  );
  const chartData = (
    period === 'year'
      ? Array.from({ length: 12 }, (_, i) => ({
          label: new Date(2026, i, 1).toLocaleDateString('en-IN', {
            month: 'short',
          }),
          entries: active.filter((t) => Number(t.date.slice(5, 7)) === i + 1),
        }))
      : Array.from({ length: Math.min(4, reportDays) }, (_, i) => {
          const buckets = Math.min(4, reportDays);
          const start = new Date(
            Date.parse(reportStart) +
              Math.floor((i * reportDays) / buckets) * 86400000,
          )
            .toISOString()
            .slice(0, 10);
          const end = new Date(
            Date.parse(reportStart) +
              Math.floor(((i + 1) * reportDays) / buckets) * 86400000,
          )
            .toISOString()
            .slice(0, 10);
          return {
            label: new Date(`${start}T12:00:00`).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            }),
            entries: active.filter((t) => t.date >= start && t.date < end),
          };
        })
  ).map((group) => ({
    label: group.label,
    income: group.entries
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0),
    expense: group.entries
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0),
  }));
  const chartMax = Math.max(
    ...chartData.map((d) => Math.max(d.income, d.expense)),
    10000,
  );
  const charts = (
    <div className="charts-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Income vs expenses</h3>
            <p>A little perspective on your cash flow.</p>
          </div>
          <span className="small-tag">
            {period === 'custom'
              ? 'Custom date range'
              : period === 'year'
                ? month.slice(0, 4)
                : monthLabel(month)}
          </span>
        </div>
        <div className="legend">
          <span>
            <i className="green-dot" />
            Income
          </span>
          <span>
            <i className="peach-dot" />
            Expenses
          </span>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label="Income and expenses grouped by period"
        >
          <div className="chart-axis">
            {[1, 0.75, 0.5, 0.25, 0].map((v) => (
              <span key={v}>{money(Math.round(chartMax * v))}</span>
            ))}
          </div>
          <div className="bars">
            {chartData.map((d) => (
              <div className="bar-group" key={d.label}>
                <div className="bar-pair">
                  <div
                    className="bar income-bar"
                    style={{ height: `${(d.income / chartMax) * 100}%` }}
                    title={`${d.label} income: ${money(d.income)}`}
                  />
                  <div
                    className="bar expense-bar"
                    style={{ height: `${(d.expense / chartMax) * 100}%` }}
                    title={`${d.label} expenses: ${money(d.expense)}`}
                  />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-foot">
          <span>Every entry adds to the bigger picture.</span>
          <ArrowUpRight size={16} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Where your money goes</h3>
            <p>Expenses by category</p>
          </div>
        </div>
        <div className="spending-total">
          <strong>{money(expense)}</strong>
          <span>Total spent</span>
        </div>
        <div className="segmented-bar">
          {breakdown.map((c) => (
            <button
              key={c.id}
              style={{
                width: `${(c.total / expense) * 100}%`,
                background: c.color,
              }}
              aria-label={`${c.name}: ${money(c.total)}`}
              onClick={() => drillDown(c.id)}
            />
          ))}
        </div>
        <div className="category-breakdown">
          {breakdown.length ? (
            breakdown.map((c) => (
              <button key={c.id} onClick={() => drillDown(c.id)}>
                <span>
                  <i style={{ background: c.color }} />
                  {c.name}
                </span>
                <strong>{money(c.total)}</strong>
                <small>{Math.round((c.total / expense) * 100)}%</small>
              </button>
            ))
          ) : (
            <p className="empty">No expenses in this period.</p>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <FluentProvider
      theme={{
        ...(dark ? webDarkTheme : webLightTheme),
        colorBrandBackground: dark ? '#4979d6' : '#3565c9',
        colorBrandBackgroundHover: '#2956b1',
        colorBrandBackgroundPressed: '#204795',
      }}
      className="fluent-root"
    >
      {auth ? (
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
          <div className="auth-form">
            <button
              className="text-link"
              onClick={() => {
                setAuth(null);
                setAuthNotice('');
              }}
            >
              <ChevronLeft size={16} /> Back to review
            </button>
            <h2>
              {auth === 'signup'
                ? 'Your fresh start.'
                : auth === 'reset'
                  ? 'Let’s get you back in.'
                  : 'Welcome back.'}
            </h2>
            <p>
              {auth === 'signup'
                ? 'Create your personal space for money.'
                : auth === 'reset'
                  ? 'Enter your email to reset your password.'
                  : 'A clearer picture of your money awaits.'}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAuthNotice(
                  'This is a layout preview. No account was created and no email was sent.',
                );
              }}
            >
              {auth === 'signup' && (
                <label>
                  Your name
                  <Input required placeholder="e.g. Chaitanya" />
                </label>
              )}
              <label>
                Email address
                <Input required type="email" placeholder="you@example.com" />
              </label>
              {auth !== 'reset' && (
                <label>
                  Password
                  <Input
                    required
                    type="password"
                    minLength={8}
                    placeholder="At least 8 characters"
                    autoComplete={
                      auth === 'signup' ? 'new-password' : 'current-password'
                    }
                  />
                </label>
              )}
              {auth === 'signin' && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setAuth('reset');
                    setAuthNotice('');
                  }}
                >
                  Forgot password?
                </button>
              )}
              <FluentButton appearance="primary" type="submit">
                {auth === 'signup'
                  ? 'Create account'
                  : auth === 'reset'
                    ? 'Send reset link'
                    : 'Sign in'}{' '}
                <ArrowRight size={16} />
              </FluentButton>
            </form>
            {authNotice && (
              <p className="info-note" role="status">
                {authNotice}
              </p>
            )}
            <p>
              {auth === 'signup' ? 'Already have an account?' : 'New to Paisa?'}{' '}
              <button
                className="text-link"
                onClick={() => {
                  setAuth(auth === 'signup' ? 'signin' : 'signup');
                  setAuthNotice('');
                }}
              >
                {auth === 'signup' ? 'Sign in' : 'Create account'}
              </button>
            </p>
            <div className="preview-note">
              <ShieldCheck size={16} /> Screen preview · please use sample
              details
            </div>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <button className="brand" onClick={() => navigate('Overview')}>
              <span className="brand-symbol">
                <Leaf size={23} />
              </span>
              paisa<span className="brand-period">.</span>
            </button>
            <div className="workspace-label">YOUR PERSONAL SPACE</div>
            <nav aria-label="Main navigation">
              {pages
                .filter(([name]) => name !== 'Budgets' || budgeting)
                .map(([name, Icon]) => (
                  <button
                    key={name}
                    className={`nav-item ${page === name ? 'active' : ''}`}
                    onClick={() => navigate(name)}
                  >
                    <Icon size={19} />
                    <span>{name}</span>
                    {page === name && <span className="nav-dot" />}
                  </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-tip">
                <Leaf size={23} />
                <h4>Small steps. More clarity.</h4>
                <p>A quick daily check-in goes a long way.</p>
              </div>
              <button className="profile" onClick={() => navigate('Settings')}>
                <span className="avatar">C</span>
                <span>
                  <strong>Chaitanya</strong>
                  <small>Personal account</small>
                </span>
                <Settings size={17} />
              </button>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <span className="breadcrumb">
                My workspace <ChevronRight size={13} />
                <strong>{page}</strong>
              </span>
              <span className="review-badge">
                <span />
                Layout preview
              </span>
              <button
                className="avatar mobile-avatar"
                aria-label="Account settings"
                onClick={() => navigate('Settings')}
              >
                C
              </button>
            </header>
            <main className="main-content">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {page === 'Overview'
                      ? 'YOUR MONEY, AT A GLANCE'
                      : 'A CLEARER PICTURE'}
                  </span>
                  <h1>
                    {page === 'Overview'
                      ? 'A little clarity, every day.'
                      : page}
                  </h1>
                  <p>
                    {
                      (
                        {
                          Overview: 'Here’s how your month is shaping up.',
                          Transactions:
                            'The everyday details behind your bigger picture.',
                          Analytics:
                            'Find the patterns. Make more informed choices.',
                          Budgets: 'Give your spending a little direction.',
                          Categories:
                            'Organise your money in a way that makes sense to you.',
                          Settings: 'Make this space your own.',
                        } as Record<string, string>
                      )[page]
                    }
                  </p>
                </div>
                <div className="heading-actions">
                  {!['Categories', 'Settings'].includes(page) && (
                    <div
                      className="month-picker"
                      role="group"
                      aria-label="Month navigation"
                    >
                      <button
                        title="Previous month"
                        aria-label="Previous month"
                        onClick={() => moveMonth(-1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <input
                        aria-label="Selected month"
                        type="month"
                        value={month}
                        onChange={(e) =>
                          e.target.value && setMonth(e.target.value)
                        }
                      />
                      <button
                        title="Next month"
                        aria-label="Next month"
                        onClick={() => moveMonth(1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                  {['Overview', 'Transactions', 'Analytics'].includes(page) && (
                    <FluentButton
                      appearance="primary"
                      icon={<Plus size={17} />}
                      onClick={() => openTransaction()}
                    >
                      Add transaction
                    </FluentButton>
                  )}
                </div>
              </div>
              {page === 'Overview' && (
                <>
                  {stats}
                  {budgeting && (
                    <section className="panel overview-budget">
                      <div className="panel-heading">
                        <div>
                          <h3>Monthly budget progress</h3>
                          <p>
                            Your category limits, right alongside your monthly
                            totals.
                          </p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate('Budgets')}
                        >
                          Manage budgets <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="budget-mini-grid">
                        {expenses
                          .filter(
                            (c) =>
                              !c.archived && budgets[`${month}:${c.id}`] > 0,
                          )
                          .map((c) => {
                            const limit = budgets[`${month}:${c.id}`];
                            const spent = categorySpend(c.id);
                            return (
                              <button
                                className="budget-mini"
                                key={c.id}
                                onClick={() => navigate('Budgets')}
                              >
                                <span>
                                  <strong>{c.name}</strong>
                                  <small>
                                    {Math.round((spent / limit) * 100)}%
                                  </small>
                                </span>
                                <div
                                  className="progress"
                                  role="progressbar"
                                  aria-label={`${c.name} budget used`}
                                  aria-valuenow={Math.min(
                                    Math.round((spent / limit) * 100),
                                    100,
                                  )}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <span
                                    style={{
                                      width: `${Math.min((spent / limit) * 100, 100)}%`,
                                      background:
                                        spent > limit
                                          ? 'var(--expense)'
                                          : 'var(--primary)',
                                    }}
                                  />
                                </div>
                                <small>
                                  {spent > limit
                                    ? `${money(spent - limit)} over`
                                    : `${money(limit - spent)} remaining`}
                                </small>
                              </button>
                            );
                          })}
                      </div>
                      {!expenses.some(
                        (c) => !c.archived && budgets[`${month}:${c.id}`] > 0,
                      ) && (
                        <p className="budget-empty">
                          No limits set for this month. Set your first category
                          budget to see progress here.
                        </p>
                      )}
                    </section>
                  )}
                  <div className="overview-insight">
                    <div>
                      <span className="eyebrow">THIS MONTH’S SNAPSHOT</span>
                      <h3>
                        {breakdown.length
                          ? `${breakdown[0].name} is your largest expense category.`
                          : 'Your month starts with a single entry.'}
                      </h3>
                      <p>
                        {breakdown.length
                          ? `${money(breakdown[0].total)} · ${Math.round((breakdown[0].total / expense) * 100)}% of your spending this month.`
                          : 'Add income or an expense to start building your picture.'}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate('Analytics')}
                    >
                      Explore analytics <ArrowRight size={16} />
                    </button>
                  </div>
                  <section className="panel recent">
                    <div className="panel-heading">
                      <div>
                        <h3>Recent transactions</h3>
                        <p>Your latest entries for {monthLabel(month)}.</p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate('Transactions')}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    </div>
                    {transactionRows(
                      [...monthly]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5),
                    )}
                  </section>
                </>
              )}
              {page === 'Transactions' && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>
                        All transactions{' '}
                        <span className="count-badge">{filtered.length}</span>
                      </h3>
                      <p>
                        Manual entries ·{' '}
                        {period === 'year'
                          ? month.slice(0, 4)
                          : period === 'custom'
                            ? `${from} to ${to}`
                            : monthLabel(month)}
                      </p>
                    </div>
                  </div>
                  {filters}
                  {transactionRows(filtered)}
                  <div className="table-footer">
                    {filtered.length} entries{' '}
                    <span>
                      Income {money(income)} · Expenses {money(expense)}
                    </span>
                  </div>
                </section>
              )}
              {page === 'Analytics' && (
                <>
                  {filters}
                  <div className="report-summary">
                    <span>
                      <small>INCOME</small>
                      <strong className="income-text">{money(income)}</strong>
                    </span>
                    <span>
                      <small>EXPENSES</small>
                      <strong className="expense-text">{money(expense)}</strong>
                    </span>
                    <span>
                      <small>NET SAVINGS</small>
                      <strong>{money(income - expense)}</strong>
                    </span>
                    <span>
                      <small>ENTRIES IN REPORT</small>
                      <strong>{filtered.length}</strong>
                    </span>
                  </div>
                  {charts}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Category report</h3>
                        <p>
                          Compare amounts and each category’s share of its
                          transaction type. Select a row to explore entries.
                        </p>
                      </div>
                    </div>
                    <div className="category-report">
                      {categories
                        .map((c) => ({
                          ...c,
                          total: active
                            .filter((t) => t.category === c.id)
                            .reduce((sum, t) => sum + t.amount, 0),
                          count: active.filter((t) => t.category === c.id)
                            .length,
                        }))
                        .filter((c) => c.count)
                        .sort((a, b) => b.total - a.total)
                        .map((c) => (
                          <button key={c.id} onClick={() => drillDown(c.id)}>
                            {categoryIcon(c.id)}
                            <span>
                              <strong>{c.name}</strong>
                              <small>
                                {c.type === 'income' ? 'Income' : 'Expense'} ·{' '}
                                {c.count} entries
                              </small>
                            </span>
                            <div className="report-meter">
                              <i
                                style={{
                                  width: `${(c.total / (c.type === 'income' ? income : expense)) * 100}%`,
                                  background: c.color,
                                }}
                              />
                            </div>
                            <strong>{money(c.total)}</strong>
                            <small>
                              {Math.round(
                                (c.total /
                                  (c.type === 'income' ? income : expense)) *
                                  100,
                              )}
                              %
                            </small>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                    </div>
                    {!filtered.length && (
                      <p className="empty">No entries match these filters.</p>
                    )}
                  </section>
                </>
              )}
              {page === 'Categories' && (
                <>
                  <div className="section-toolbar">
                    <span>
                      {categories.filter((c) => !c.archived).length} active
                      categories
                    </span>
                    {action('+ Add category', () => {
                      setEditing(null);
                      setCategoryName('');
                      setCategoryColor('#3565c9');
                      setCategoryType('expense');
                      setError('');
                      setModal('category');
                    })}
                  </div>
                  {(['expense', 'income'] as Kind[]).map((type) => (
                    <section key={type} className="category-section">
                      <h3>
                        {type === 'expense' ? 'Expense' : 'Income'} categories
                      </h3>
                      <div className="category-grid">
                        {categories
                          .filter((c) => c.type === type)
                          .map((c) => (
                            <article
                              className={`panel category-card ${c.archived ? 'archived' : ''}`}
                              key={c.id}
                            >
                              <div className="category-card-top">
                                {categoryIcon(c.id)}
                                <div className="category-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={`Edit ${c.name}`}
                                    onClick={() => {
                                      setEditing(c.id);
                                      setCategoryName(c.name);
                                      setCategoryColor(c.color);
                                      setCategoryType(c.type);
                                      setError('');
                                      setModal('category');
                                    }}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="text-link"
                                    onClick={() => {
                                      setCategories((old) =>
                                        old.map((x) =>
                                          x.id === c.id
                                            ? { ...x, archived: !x.archived }
                                            : x,
                                        ),
                                      );
                                      notify(
                                        c.archived
                                          ? 'Category restored'
                                          : 'Category archived',
                                      );
                                    }}
                                  >
                                    {c.archived ? 'Restore' : 'Archive'}
                                  </button>
                                </div>
                              </div>
                              <h3>
                                <span
                                  className="category-pill"
                                  style={{
                                    background: `${c.color}20`,
                                    borderColor: `${c.color}55`,
                                  }}
                                >
                                  <i style={{ background: c.color }} />
                                  {c.name}
                                </span>
                              </h3>
                              <p>
                                {
                                  transactions.filter(
                                    (t) => t.category === c.id,
                                  ).length
                                }{' '}
                                transactions ·{' '}
                                {c.archived ? 'Archived' : 'Active'}
                              </p>
                            </article>
                          ))}
                      </div>
                    </section>
                  ))}
                </>
              )}
              {page === 'Budgets' && (
                <>
                  <div className="budget-callout">
                    <span className="stat-icon brand-icon">
                      <Wallet size={24} />
                    </span>
                    <div>
                      <h3>Your monthly spending plan</h3>
                      <p>
                        Limits guide your spending. They won’t block new
                        expenses.
                      </p>
                    </div>
                    {action('+ Set a budget', () => {
                      setBudgetCategory('food');
                      setBudgetAmount(
                        String((budgets[`${month}:food`] || 1000000) / 100),
                      );
                      setModal('budget');
                    })}
                  </div>
                  <div className="budget-grid">
                    {expenses
                      .filter((c) => !c.archived)
                      .map((c) => {
                        const limit = budgets[`${month}:${c.id}`] || 0;
                        const spent = categorySpend(c.id);
                        return (
                          <article className="panel budget-card" key={c.id}>
                            <div className="panel-heading">
                              <div className="budget-title">
                                {categoryIcon(c.id)}
                                <h3>{c.name}</h3>
                              </div>
                              <button
                                className="icon-button"
                                aria-label={`Edit budget for ${c.name}`}
                                onClick={() => {
                                  setBudgetCategory(c.id);
                                  setBudgetAmount(
                                    limit ? String(limit / 100) : '',
                                  );
                                  setModal('budget');
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                            <h2>
                              {money(spent)}{' '}
                              <small>
                                {limit ? `of ${money(limit)}` : 'spent'}
                              </small>
                            </h2>
                            <div className="progress">
                              <span
                                style={{
                                  width: `${limit ? Math.min((spent / limit) * 100, 100) : 0}%`,
                                  background:
                                    spent > limit && limit
                                      ? 'var(--expense)'
                                      : 'var(--primary)',
                                }}
                              />
                            </div>
                            <div className="budget-status">
                              <span>
                                {limit
                                  ? spent > limit
                                    ? `${money(spent - limit)} over budget`
                                    : `${money(limit - spent)} left`
                                  : 'No budget set'}
                              </span>
                              <strong>
                                {limit
                                  ? `${Math.round((spent / limit) * 100)}%`
                                  : '—'}
                              </strong>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                </>
              )}
              {page === 'Settings' && (
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
                          chaitanya@example.com{' '}
                          <span className="small-tag">Sample account</span>
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
                          notify(
                            value
                              ? 'Category budgeting enabled'
                              : 'Category budgeting turned off',
                          );
                        }}
                      />
                    </div>
                    <div className="setting-row">
                      <div>
                        <h4>Appearance</h4>
                        <p>Choose what feels comfortable.</p>
                      </div>
                      <div className="appearance-options">
                        {[
                          ['light', Sun],
                          ['dark', Moon],
                          ['system', Monitor],
                        ].map(([value, Icon]) => (
                          <button
                            key={value as string}
                            className={appearance === value ? 'selected' : ''}
                            onClick={() => setAppearance(value as string)}
                            aria-label={`${value as string} appearance`}
                          >
                            {typeof Icon !== 'string' && <Icon size={17} />}
                            <span>{value as string}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section className="panel settings-card">
                    <div className="panel-heading">
                      <div>
                        <h3>Account screen previews</h3>
                        <p>
                          Review the sign-in, registration, and password reset
                          layouts.
                        </p>
                      </div>
                    </div>
                    <div className="account-buttons">
                      {action('Preview sign in', () => setAuth('signin'), true)}
                      {action(
                        'Preview registration',
                        () => setAuth('signup'),
                        true,
                      )}
                      {action(
                        'Preview password reset',
                        () => setAuth('reset'),
                        true,
                      )}
                    </div>
                    <p className="preview-note">
                      This review uses sample data in memory. Changes reset when
                      the page reloads. Authentication and cross-device sync are
                      not connected yet.
                    </p>
                  </section>
                </div>
              )}
              <footer className="app-footer">
                <span>
                  <Leaf size={13} /> A little more mindful. A little more yours.
                </span>
                <span>INR · Sample data for review</span>
              </footer>
            </main>
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {pages
              .filter(([name]) => name !== 'Budgets' || budgeting)
              .map(([name, Icon]) => (
                <button
                  key={name}
                  onClick={() => navigate(name)}
                  className={page === name ? 'active' : ''}
                >
                  <Icon size={20} />
                  <span>{name}</span>
                </button>
              ))}
          </nav>
        </div>
      )}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="entry-dialog">
          <DialogTitle>
            {modal === 'transaction'
              ? editing
                ? 'Edit transaction'
                : 'A new entry'
              : modal === 'category'
                ? editing
                  ? 'Edit category'
                  : 'Add category'
                : modal === 'budget'
                  ? 'Set a monthly budget'
                  : 'Delete this transaction?'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'transaction'
              ? 'A small moment to keep your money in focus.'
              : modal === 'budget'
                ? `Expense limit for ${monthLabel(month)}.`
                : modal === 'delete'
                  ? 'This will also update your totals and budget progress.'
                  : 'Keep things organised, your way.'}
          </DialogDescription>
          {modal === 'transaction' && (
            <form onSubmit={saveTransaction}>
              <div className="type-toggle">
                {(['expense', 'income'] as Kind[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={entry.type === type ? 'selected' : ''}
                    onClick={() =>
                      setEntry({
                        ...entry,
                        type,
                        category:
                          categories.find((c) => c.type === type && !c.archived)
                            ?.id || '',
                      })
                    }
                  >
                    {type === 'expense' ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownLeft size={17} />
                    )}{' '}
                    {type === 'expense' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>
              <label>
                Amount (INR)
                <Input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={entry.amount}
                  aria-invalid={Boolean(
                    error &&
                    (!Number(entry.amount) || Number(entry.amount) <= 0),
                  )}
                  onChange={(e) => {
                    setEntry({ ...entry, amount: e.target.value });
                    setError('');
                  }}
                />
              </label>
              <div className="form-grid">
                <label>
                  Date
                  <Popover>
                    <PopoverTrigger
                      className="date-trigger"
                      aria-label="Select transaction date"
                    >
                      <span>
                        {new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                          'en-IN',
                          { day: '2-digit', month: 'short', year: 'numeric' },
                        )}
                      </span>
                      <CalendarDays size={16} />
                    </PopoverTrigger>
                    <PopoverContent
                      className="transaction-calendar"
                      align="start"
                      sideOffset={8}
                    >
                      <Calendar
                        mode="single"
                        selected={new Date(`${entry.date}T12:00:00`)}
                        onSelect={(date) => {
                          if (!date) return;
                          setEntry({
                            ...entry,
                            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                          });
                          setError('');
                        }}
                      />
                      <div className="calendar-footer">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            setEntry({
                              ...entry,
                              date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
                            });
                            setError('');
                          }}
                        >
                          Today
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </label>
                <label>
                  Category
                  <Select
                    value={entry.category}
                    onValueChange={(category) => {
                      setEntry({ ...entry, category: category ?? '' });
                      setError('');
                    }}
                  >
                    <SelectTrigger
                      className="transaction-select"
                      aria-invalid={Boolean(error && !entry.category)}
                    >
                      <SelectValue
                        className="sr-only"
                        placeholder="Select category"
                      />
                      {selectedEntryCategory ? (
                        <span className="selected-category-value">
                          <i
                            className="select-color"
                            style={{ background: selectedEntryCategory.color }}
                          />
                          {selectedEntryCategory.name}
                        </span>
                      ) : (
                        <span className="select-placeholder">
                          Select category
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent
                      className="transaction-select-menu"
                      align="start"
                    >
                      {categories
                        .filter(
                          (c) =>
                            c.type === entry.type &&
                            (!c.archived || c.id === entry.category),
                        )
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="select-option-label">
                              <i
                                className="select-color"
                                style={{ background: c.color }}
                              />
                              <span>{c.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label>
                Notes <span className="optional">optional</span>
                <Input
                  placeholder="What was it for?"
                  value={entry.notes}
                  maxLength={160}
                  onChange={(e) =>
                    setEntry({ ...entry, notes: e.target.value })
                  }
                />
              </label>
              {error && (
                <p role="alert" className="form-validation">
                  <span>!</span>
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                {editing ? (
                  <button
                    type="button"
                    className="delete-link"
                    onClick={() => setModal('delete')}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <FluentButton type="submit" appearance="primary">
                  {editing ? 'Save changes' : 'Add transaction'}
                </FluentButton>
              </div>
            </form>
          )}
          {modal === 'delete' && (
            <div className="dialog-actions">
              {action('Keep transaction', () => setModal('transaction'), true)}
              {action(
                'Delete transaction',
                () => {
                  setTransactions((old) => old.filter((t) => t.id !== editing));
                  setModal(null);
                  notify('Transaction deleted');
                },
                false,
                true,
              )}
            </div>
          )}
          {modal === 'category' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!categoryName.trim()) return;
                if (
                  categories.some(
                    (c) =>
                      c.id !== editing &&
                      c.type === categoryType &&
                      c.name.toLowerCase() ===
                        categoryName.trim().toLowerCase(),
                  )
                ) {
                  setError('A category with this name already exists.');
                  return;
                }
                setCategories((old) =>
                  editing
                    ? old.map((c) =>
                        c.id === editing
                          ? {
                              ...c,
                              name: categoryName.trim(),
                              color: categoryColor,
                            }
                          : c,
                      )
                    : [
                        ...old,
                        {
                          id: crypto.randomUUID(),
                          name: categoryName.trim(),
                          type: categoryType,
                          color: categoryColor,
                        },
                      ],
                );
                setModal(null);
                notify(editing ? 'Category updated' : 'Category added');
              }}
            >
              <label>
                Name
                <Input
                  required
                  autoFocus
                  value={categoryName}
                  maxLength={40}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </label>
              <label>
                Type
                <select
                  disabled={!!editing}
                  value={categoryType}
                  onChange={(e) => setCategoryType(e.target.value as Kind)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <fieldset className="color-field">
                <legend>Category color</legend>
                <div className="color-swatches">
                  {categoryColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Choose color ${color}`}
                      aria-pressed={categoryColor === color}
                      className={categoryColor === color ? 'chosen' : ''}
                      style={{ background: color }}
                      onClick={() => setCategoryColor(color)}
                    >
                      {categoryColor === color && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <label className="custom-color">
                  Custom color
                  <input
                    type="color"
                    aria-label="Custom category color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                  />
                  <code>{categoryColor.toUpperCase()}</code>
                </label>
                <span
                  className="category-pill badge-preview"
                  style={{
                    background: `${categoryColor}20`,
                    borderColor: `${categoryColor}55`,
                  }}
                >
                  <i style={{ background: categoryColor }} />
                  {categoryName.trim() || 'Category preview'}
                </span>
              </fieldset>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <FluentButton type="submit" appearance="primary">
                Save category
              </FluentButton>
            </form>
          )}
          {modal === 'budget' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBudgets((old) => ({
                  ...old,
                  [`${month}:${budgetCategory}`]: Math.round(
                    Number(budgetAmount) * 100,
                  ),
                }));
                setModal(null);
                notify('Monthly budget saved');
              }}
            >
              <label>
                Expense category
                <select
                  value={budgetCategory}
                  onChange={(e) => {
                    setBudgetCategory(e.target.value);
                    setBudgetAmount(
                      String(
                        (budgets[`${month}:${e.target.value}`] || 0) / 100,
                      ),
                    );
                  }}
                >
                  {expenses
                    .filter((c) => !c.archived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Monthly limit (INR)
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                />
              </label>
              <p className="preview-note">
                Set to 0 to remove the limit for this month.
              </p>
              <FluentButton type="submit" appearance="primary">
                Save budget
              </FluentButton>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </FluentProvider>
  );
}
