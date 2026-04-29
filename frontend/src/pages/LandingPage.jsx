export default function LandingPage() {
  const features = [
    {
      title: "Payroll Automation",
      description: "Run monthly salary cycles in minutes with accurate tax and compliance calculations.",
      icon: "⚡",
    },
    {
      title: "Attendance Sync",
      description: "Auto-import attendance and leave data so salary deductions stay transparent.",
      icon: "🕒",
    },
    {
      title: "Reports & Insights",
      description: "Export salary registers, PF/ESI summaries, and payout trends with one click.",
      icon: "📊",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-300">
              Payroll platform for modern teams
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Manage payroll without the spreadsheet chaos.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300 md:text-lg">
              Simplify salaries, deductions, and compliance in one intuitive dashboard built for HR and finance teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                Start Free Trial
              </button>
              <button className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800">
                Book Demo
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <p className="text-sm text-slate-400">This Month Overview</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Employees Paid</p>
                <p className="mt-1 text-2xl font-bold">124</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Total Payout</p>
                <p className="mt-1 text-2xl font-bold">$218K</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Pending Approvals</p>
                <p className="mt-1 text-2xl font-bold">07</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Compliance Status</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">On Track</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
        <h2 className="text-2xl font-semibold">Why teams choose us</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
