'use client';

import { ArrowUpRight } from 'lucide-react';
import { chartCeiling, type ChartBar } from '@/lib/aggregate';
import { money, ratio } from '@/lib/money';

export function IncomeExpenseChart({
  data,
  periodLabel,
}: {
  data: ChartBar[];
  periodLabel: string;
}) {
  const ceiling = chartCeiling(data);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Income vs expenses</h3>
          <p>A little perspective on your cash flow.</p>
        </div>
        <span className="small-tag">{periodLabel}</span>
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
      <div className="bar-chart" role="img" aria-label="Income and expenses grouped by period">
        <div className="chart-axis">
          {[1, 0.75, 0.5, 0.25, 0].map((step) => (
            <span key={step}>{money(Math.round(ceiling * step))}</span>
          ))}
        </div>
        <div className="bars">
          {data.map((d) => (
            <div className="bar-group" key={d.label}>
              <div className="bar-pair">
                <div
                  className="bar income-bar"
                  style={{ height: `${ratio(d.income, ceiling)}%` }}
                  title={`${d.label} income: ${money(d.income)}`}
                />
                <div
                  className="bar expense-bar"
                  style={{ height: `${ratio(d.expense, ceiling)}%` }}
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
  );
}
