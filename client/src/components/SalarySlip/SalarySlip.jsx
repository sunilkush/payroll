import { formatCurrency, formatMonth } from '../../utils/format.js';
import Badge from '../Badge/Badge.jsx';
import './SalarySlip.css';

// Salary slip screen par (PDF download kiye bina). Mobile par sab ek column mein upar se neeche;
// tablet se Earnings aur Deductions saath-saath.
export default function SalarySlip({ payroll }) {
  const { staff, attendance, earnings, deductions, employerContribution } = payroll;

  const rows = (items) =>
    items.map(([label, value]) => (
      <div key={label} className="salary-slip__row">
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ));

  return (
    <article className="salary-slip">
      <header className="salary-slip__header">
        <div>
          <p className="salary-slip__name">{staff.name}</p>
          <p className="salary-slip__muted">
            {staff.employeeCode} · {formatMonth(payroll.period)}
          </p>
        </div>
        <Badge tone={payroll.status === 'FINAL' ? 'success' : 'warning'}>
          {payroll.status === 'FINAL' ? 'Final' : 'Draft'}
        </Badge>
      </header>

      <dl className="salary-slip__days">
        {rows([
          ['Payable Days', payroll.payableDays],
          ['LOP Days', payroll.lopDays],
          ['Present', attendance.present],
          ['Paid Leave', attendance.leave],
          ['Week Off', attendance.weekOff],
          ['Holiday', attendance.holiday],
        ])}
      </dl>

      <div className="salary-slip__columns">
        <section>
          <h3 className="salary-slip__heading">Earnings</h3>
          <dl>
            {rows([
              ['Basic', formatCurrency(earnings.basic)],
              ['HRA', formatCurrency(earnings.hra)],
              ['Special Allowance', formatCurrency(earnings.special)],
              ['Other', formatCurrency(earnings.other)],
            ])}
            <div className="salary-slip__row salary-slip__row--total">
              <dt>Gross Earned</dt>
              <dd>{formatCurrency(earnings.gross)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3 className="salary-slip__heading">Deductions</h3>
          <dl>
            {rows([
              ['PF (Employee)', formatCurrency(deductions.pf)],
              ['ESI (Employee)', formatCurrency(deductions.esi)],
              ['Other Deductions', formatCurrency(deductions.other)],
            ])}
            <div className="salary-slip__row salary-slip__row--total">
              <dt>Total Deductions</dt>
              <dd>{formatCurrency(deductions.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p className="salary-slip__net">
        <span>Net Salary</span>
        <strong>{formatCurrency(payroll.netSalary)}</strong>
      </p>

      {payroll.remarks && <p className="salary-slip__muted">Remarks: {payroll.remarks}</p>}

      {employerContribution.total > 0 && (
        <section>
          <h3 className="salary-slip__heading">Employer Contributions (not deducted from salary)</h3>
          <dl>
            {rows([
              ['EPF', formatCurrency(employerContribution.epf)],
              ['EPS', formatCurrency(employerContribution.eps)],
              ['ESI', formatCurrency(employerContribution.esi)],
              ['EDLI', formatCurrency(employerContribution.edli)],
              ['PF Admin Charges', formatCurrency(employerContribution.pfAdmin)],
            ])}
          </dl>
        </section>
      )}
    </article>
  );
}
