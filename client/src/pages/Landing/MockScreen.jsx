// App ke screens ki halki nakal (HTML/CSS se, koi image nahi), taaki page tez khule aur har size par saaf dikhe.
// Andar ka data sirf namoona hai.

const NAV_ITEMS = ['Dashboard', 'Staff', 'Attendance', 'Leaves', 'Meetings', 'Payroll'];

// [label, value, tone]
const SCREENS = {
  dashboard: {
    active: 'Dashboard',
    title: 'Good morning, Rajesh',
    tiles: [['Active staff', '48'], ['Present today', '94%', 'success'], ['Pending leave', '3', 'warning'], ['Payroll · Oct', '₹8.4L']],
    chartTitle: 'Attendance trend',
    bars: [62, 78, 74, 86, 82, 92, 88, 94, 90, 96],
    listTitle: 'Recent activity',
    rows: [['Ravi Kumar punched in', 'Head Office · 18 m', '09:28 am', 'success'], ['Sunita Devi applied for leave', 'CL · 1 day', '09:12 am', 'warning'], ['Imran Ansari checked in', 'Client visit · Verified', '08:55 am', 'info']],
  },
  attendance: {
    active: 'Attendance',
    title: 'Attendance · October',
    tiles: [['Present', '22', 'success'], ['Absent', '1', 'danger'], ['Leave', '2'], ['Late', '3', 'warning']],
    chartTitle: 'Days present per week',
    bars: [80, 100, 100, 80, 100, 60, 100, 100],
    listTitle: 'Today',
    rows: [['Ravi Kumar', 'Punch in 09:28 am · Head Office', 'Present', 'success'], ['Mohan Lal', 'Punch in 10:05 am · Head Office', 'Late', 'warning'], ['Neha Bansal', 'Half day CL (first half)', 'Half Day', 'info']],
  },
  leave: {
    active: 'Leaves',
    title: 'Leave Requests',
    tiles: [['Pending', '3', 'warning'], ['Approved', '18', 'success'], ['CL balance', '6.5'], ['EL balance', '11.25']],
    chartTitle: 'Leave taken per month',
    bars: [20, 35, 15, 40, 25, 30, 18, 22],
    listTitle: 'Waiting for approval',
    rows: [['Sunita Devi', 'CL · 1 day · 14 Oct', 'Pending', 'warning'], ['Vikas Chauhan', 'EL · 2 days · 20 Oct', 'Pending', 'warning'], ['Kiran Mehta', 'CL · Half day · 16 Oct', 'Pending', 'warning']],
  },
  payroll: {
    active: 'Payroll',
    title: 'Payroll · October 2026',
    tiles: [['Net salary', '₹8.4L'], ['PF', '₹62K'], ['ESI', '₹9.8K'], ['Status', 'Draft', 'warning']],
    chartTitle: 'Payroll cost, last 6 months',
    bars: [70, 72, 75, 74, 82, 84],
    listTitle: 'Salary sheet',
    rows: [['Ravi Kumar', '30 payable days · PF, ESI', '₹18,050', ''], ['Sunita Devi', '29 payable days · 1 LOP', '₹16,420', ''], ['Imran Ansari', '30 payable days · PF', '₹44,200', '']],
  },
  sales: {
    active: 'Meetings',
    title: 'Sales Meetings · Today',
    tiles: [['Today', '6'], ['Checked in', '2', 'warning'], ['Completed', '3', 'success'], ['Missed', '1', 'danger']],
    chartTitle: 'Visits completed this week',
    bars: [40, 60, 55, 80, 70, 90],
    listTitle: "Today's visits",
    rows: [['Sharma Auto Components', 'Ravi Kumar · 33 m from location', 'Verified', 'success'], ['Northern Forgings', 'Imran Ansari · Checked in 11:04 am', 'In progress', 'warning'], ['Kiran Packaging', 'Ravi Kumar · 04:30 pm', 'Scheduled', 'info']],
  },
  reports: {
    active: 'Payroll',
    title: 'Reports',
    tiles: [['Attendance rate', '94%', 'success'], ['Avg. hours', '8h 40m'], ['Late arrivals', '12', 'warning'], ['Visits verified', '96%', 'success']],
    chartTitle: 'Attendance rate by month',
    bars: [88, 90, 86, 92, 91, 94, 93, 95],
    listTitle: 'Downloads',
    rows: [['Payroll sheet · October', 'Excel · 48 staff', 'Ready', 'success'], ['Salary slips · September', 'PDF · finalized', 'Ready', 'success'], ['Sales visits · This month', 'Excel · 42 meetings', 'Ready', 'success']],
  },
};

// variant: SHOWCASE_TABS ka key. compact: chhota version (hero / "why us" ke liye, sidebar ke bina).
export default function MockScreen({ variant = 'dashboard', compact = false }) {
  const screen = SCREENS[variant] ?? SCREENS.dashboard;

  return (
    <div className={`mock${compact ? ' mock--compact' : ''}`} role="img" aria-label={`PayRoster ${screen.title} screen (sample data)`}>
      <div className="mock__bar" aria-hidden="true">
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="mock__url">PayRoster · {screen.active}</span>
      </div>
      <div className="mock__body" aria-hidden="true">
        {!compact && (
          <div className="mock__side">
            <div className="mock__brand">
              <span className="mock__logo">P</span> PayRoster
            </div>
            {NAV_ITEMS.map((item) => (
              <span key={item} className={`mock__nav${item === screen.active ? ' mock__nav--active' : ''}`}>
                {item}
              </span>
            ))}
          </div>
        )}
        <div className="mock__main">
          <p className="mock__title">{screen.title}</p>
          <div className="mock__tiles">
            {screen.tiles.map(([label, value, tone]) => (
              <div key={label} className="mock__tile">
                <span className="mock__tile-label">{label}</span>
                <span className={`mock__tile-value${tone ? ` mock__tone--${tone}` : ''}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mock__panels">
            <div className="mock__panel">
              <p className="mock__panel-title">{screen.chartTitle}</p>
              <div className="mock__chart">
                {screen.bars.map((height, index) => (
                  <span key={index} className="mock__chart-bar" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="mock__panel">
              <p className="mock__panel-title">{screen.listTitle}</p>
              {screen.rows.map(([title, meta, right, tone]) => (
                <div key={title} className="mock__row">
                  <span className="mock__row-text">
                    <span className="mock__row-title">{title}</span>
                    <span className="mock__row-meta">{meta}</span>
                  </span>
                  <span className={`mock__chip${tone ? ` mock__chip--${tone}` : ''}`}>{right}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
