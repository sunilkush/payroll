import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './Charts.css';

// Dashboard ke charts (Recharts par). Sab ek hi andaaz mein: halki grid, bina axis line, 2-3 rang,
// bina animation. Rang variables.css ke --color-chart-* se aate hain.
//
//   <AreaTrend data xKey series={[{ key, name, color, dashed }]} />   samay ke saath badalti ginti / rate
//   <BarTrend  data xKey series={[...]} stacked />                    mahine-wise tulna
//   <Donut     data={[{ name, value, color }]} total label />         hisse
//   <Sparkline data={[{ value }]} />                                  KPI card ki chhoti line

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-muted)' };
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)'];

// Hover par dikhne wala dabba
function ChartTooltip({ active, payload, label, formatLabel, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{formatLabel ? formatLabel(label) : label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="chart-tooltip__row">
          <svg className="chart-tooltip__swatch" viewBox="0 0 8 8" aria-hidden="true">
            <circle cx="4" cy="4" r="4" fill={entry.color ?? entry.payload?.color} />
          </svg>
          <span>{entry.name}</span>
          <strong>{entry.value === null || entry.value === undefined ? '-' : formatValue ? formatValue(entry.value) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

// Chart ke neeche rang + naam
export function ChartLegend({ items }) {
  return (
    <ul className="chart-legend">
      {items.map((item, index) => (
        <li key={item.name} className="chart-legend__item">
          <svg className="chart-legend__swatch" viewBox="0 0 8 8" aria-hidden="true">
            <circle cx="4" cy="4" r="4" fill={item.color ?? COLORS[index % COLORS.length]} />
          </svg>
          {item.name}
          {item.value !== undefined && <strong>{item.value}</strong>}
        </li>
      ))}
    </ul>
  );
}

export function AreaTrend({ data, xKey, series, height = 260, formatX, formatY, formatValue }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={MARGIN}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatX} minTickGap={28} />
          <YAxis width={40} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatY} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--color-border)' }}
            content={<ChartTooltip formatLabel={formatX} formatValue={formatValue ?? formatY} />}
          />
          {series.map((item, index) => {
            const color = item.color ?? COLORS[index % COLORS.length];
            return (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '4 4' : undefined}
                fill={color}
                fillOpacity={item.dashed ? 0 : 0.1}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
      <ChartLegend items={series.map((item, index) => ({ name: item.name, color: item.color ?? COLORS[index % COLORS.length] }))} />
    </div>
  );
}

export function BarTrend({ data, xKey, series, stacked = false, height = 260, formatY, formatValue }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={MARGIN} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis width={48} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatY} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--color-bg)' }} content={<ChartTooltip formatValue={formatValue ?? formatY} />} />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              stackId={stacked ? 'stack' : undefined}
              fill={item.color ?? COLORS[index % COLORS.length]}
              // Stack mein sirf sabse upar wale bar ke kone gol
              radius={!stacked || index === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend items={series.map((item, index) => ({ name: item.name, color: item.color ?? COLORS[index % COLORS.length] }))} />
    </div>
  );
}

// data: [{ name, value, color }]. Beech mein bada number (total) aur uska label.
export function Donut({ data, total, label, height = 200 }) {
  const withColor = data.map((item, index) => ({ ...item, color: item.color ?? COLORS[index % COLORS.length] }));
  return (
    <div className="chart">
      <div className="chart-donut">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={withColor}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={withColor.filter((item) => item.value > 0).length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {withColor.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-donut__center">
          <span className="chart-donut__total">{total}</span>
          <span className="chart-donut__label">{label}</span>
        </div>
      </div>
      <ChartLegend items={withColor} />
    </div>
  );
}

// tone: primary | success | warning | danger (line ka rang)
export function Sparkline({ data, tone = 'primary' }) {
  const color = `var(--color-${tone})`;
  return (
    <div className="chart-sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height={36}>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.08}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
