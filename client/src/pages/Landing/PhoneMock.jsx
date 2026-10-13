// Mobile app ke screens ki halki nakal (HTML/CSS se, koi image nahi), MockScreen ki tarah.
// Screens wahi hain jo asli app (mobile/) mein staff aur admin ko dikhti hain. Andar ka data sirf namoona hai.

const TABS = {
  staff: ['Punch', 'Attendance', 'Leaves', 'Salary'],
  admin: ['Today', 'Leaves', 'Corrections', 'Profile'],
};

// rows: [title, meta, chip, tone]   stats: [label, value, tone]
const SCREENS = {
  punch: {
    role: 'staff',
    tab: 'Punch',
    title: 'Hi, Ravi',
    subtitle: '13 Oct 2026',
    card: { heading: 'You are punched in', chip: 'Present', tone: 'success', button: 'Punch out', danger: true, note: 'Location is checked only when you punch.' },
    stats: [['First in', '09:28 am'], ['Worked', '6h 12m']],
    rows: [['Head Office', 'within 100 m', 'In range', 'success']],
  },
  leave: {
    role: 'staff',
    tab: 'Leaves',
    title: 'My leaves',
    stats: [['CL available', '6.5', 'success'], ['EL available', '11.25', 'success']],
    card: { button: 'Apply for leave' },
    rows: [['CL · 1 day', '14 Oct 2026', 'Pending', 'warning'], ['EL · 2 days', '02 Sep - 03 Sep', 'Approved', 'success']],
  },
  salary: {
    role: 'staff',
    tab: 'Salary',
    title: 'My salary',
    rows: [['Sep 2026', 'Payable days 30 · PF, ESI', '₹18,050', ''], ['Aug 2026', 'Payable days 29 · 1 LOP', '₹17,448', ''], ['Jul 2026', 'Payable days 30', '₹18,050', '']],
    card: { button: 'Download slip', outline: true },
  },
  approvals: {
    role: 'admin',
    tab: 'Leaves',
    title: 'Leave requests',
    rows: [['Sunita Devi', 'CL · 1 day · 14 Oct', 'Pending', 'warning'], ['Vikas Chauhan', 'EL · 2 days · 20 Oct', 'Pending', 'warning']],
    card: { button: 'Approve', secondButton: 'Reject' },
  },
};

// variant: SCREENS ka key
export default function PhoneMock({ variant = 'punch' }) {
  const screen = SCREENS[variant] ?? SCREENS.punch;
  const { card } = screen;

  return (
    <div className="phone" role="img" aria-label={`PayRoster mobile app, ${screen.title} screen (sample data)`}>
      <div className="phone__screen" aria-hidden="true">
        <span className="phone__notch" />
        <p className="phone__title">{screen.title}</p>
        {screen.subtitle && <p className="phone__subtitle">{screen.subtitle}</p>}

        {screen.stats && (
          <div className="phone__stats">
            {screen.stats.map(([label, value, tone]) => (
              <div key={label} className="phone__stat">
                <span className={`phone__stat-value${tone ? ` mock__tone--${tone}` : ''}`}>{value}</span>
                <span className="phone__muted">{label}</span>
              </div>
            ))}
          </div>
        )}

        {card?.heading && (
          <div className="phone__card">
            <div className="phone__row">
              <span className="phone__heading">{card.heading}</span>
              <span className={`mock__chip mock__chip--${card.tone}`}>{card.chip}</span>
            </div>
            <span className={`phone__button${card.danger ? ' phone__button--danger' : ''}`}>{card.button}</span>
            <span className="phone__muted">{card.note}</span>
          </div>
        )}

        {screen.rows.map(([title, meta, chip, tone]) => (
          <div key={title} className="phone__card phone__row">
            <span className="phone__row-text">
              <span className="phone__heading">{title}</span>
              <span className="phone__muted">{meta}</span>
            </span>
            <span className={tone ? `mock__chip mock__chip--${tone}` : 'phone__heading'}>{chip}</span>
          </div>
        ))}

        {card && !card.heading && (
          <div className="phone__actions">
            {card.secondButton && <span className="phone__button phone__button--outline">{card.secondButton}</span>}
            <span className={`phone__button${card.outline ? ' phone__button--outline' : ''}`}>{card.button}</span>
          </div>
        )}

        <div className="phone__tabs">
          {TABS[screen.role].map((tab) => (
            <span key={tab} className={`phone__tab${tab === screen.tab ? ' phone__tab--active' : ''}`}>
              {tab}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
