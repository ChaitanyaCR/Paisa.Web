'use client';

import { ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ChartBar } from '@/lib/aggregate';
import { money } from '@/lib/money';

const chartConfig = {
  income: { label: 'Income', color: 'var(--income)' },
  expense: { label: 'Expenses', color: 'var(--expense)' },
} satisfies ChartConfig;

export function IncomeExpenseChart({
  data,
  periodLabel,
}: {
  data: ChartBar[];
  periodLabel: string;
}) {
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
      <ChartContainer className="analytics-chart" config={chartConfig}>
        <BarChart
          data={data}
          accessibilityLayer
          margin={{ top: 8, right: 4, left: -18 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => money(Number(value))}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value) => money(Number(value))}
              />
            }
          />
          <Bar
            dataKey="income"
            fill="var(--color-income)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expense"
            fill="var(--color-expense)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
      <div className="chart-foot">
        <span>Every entry adds to the bigger picture.</span>
        <ArrowUpRight size={16} />
      </div>
    </section>
  );
}
