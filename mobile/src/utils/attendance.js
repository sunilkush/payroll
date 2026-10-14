// Aaj ke punches se screen ki cheezein: net kaam ka time (second tak), timeline aur status ka naam.
// Ginti server ke evaluatePunches jaisi: poore IN -> OUT hisse jodo, chalu hissa (aakhri IN se abhi tak) bhi,
// OUT -> agla IN break hai (kaam mein nahi ginta). "Abhi" hamesha server ki ghadi se (useToday ka serverNow).

// Purane records mein punches khali hote hain, sirf punchIn / punchOut.
export function punchesOf(attendance) {
  if (!attendance) return [];
  const list = attendance.punches?.length
    ? attendance.punches
    : [
        { ...attendance.punchIn, type: 'IN' },
        ...(attendance.punchOut ? [{ ...attendance.punchOut, type: 'OUT' }] : []),
      ];
  return [...list].sort((a, b) => new Date(a.time) - new Date(b.time));
}

// Net kaam, seconds mein. lunchDeductionMinutes: server ka (working hours ON ho aur break kam liya ho to wo kaatta hai).
export function netWorkSeconds(punches, nowMs, lunchDeductionMinutes = 0) {
  let total = 0;
  let openIn = null;
  for (const punch of punches) {
    const at = new Date(punch.time).getTime();
    if (punch.type === 'IN') openIn = at;
    else if (punch.type === 'OUT' && openIn !== null) {
      total += Math.max(0, at - openIn);
      openIn = null;
    }
  }
  if (openIn !== null) total += Math.max(0, nowMs - openIn);
  return Math.max(0, Math.floor(total / 1000) - lunchDeductionMinutes * 60);
}

// Timeline ki lines: { kind: 'work', in, out (null = chal raha), minutes } aur beech mein { kind: 'break', from, to, minutes }.
export function timelineOf(punches, nowMs) {
  const rows = [];
  let openIn = null;
  let lastOut = null;
  for (const punch of punches) {
    if (punch.type === 'IN') {
      if (lastOut) {
        rows.push({ kind: 'break', from: lastOut.time, to: punch.time, minutes: minutesBetween(lastOut.time, punch.time) });
        lastOut = null;
      }
      openIn = punch;
    } else if (punch.type === 'OUT' && openIn) {
      rows.push({ kind: 'work', in: openIn, out: punch, minutes: minutesBetween(openIn.time, punch.time) });
      lastOut = punch;
      openIn = null;
    }
  }
  if (openIn) rows.push({ kind: 'work', in: openIn, out: null, minutes: Math.max(0, Math.floor((nowMs - new Date(openIn.time)) / 60000)) });
  return rows;
}

const minutesBetween = (from, to) => Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));

// 3725 -> '01:02:05'
export function formatClock(seconds) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

// Dark card ki pill: server ka status + abhi kaam chal raha hai ya nahi.
// Kaam chalte waqt kabhi "Half day" nahi (server bhi tab PENDING hi deta hai).
export function dayPill(metrics) {
  if (!metrics || metrics.status === 'NOT_MARKED') return { variant: 'neutral', label: 'Not punched in' };
  if (metrics.isCurrentlyWorking) return { variant: 'info', label: `Working · Punch ${metrics.punchCount}` };
  if (metrics.status === 'PRESENT') return { variant: 'success', label: 'Present' };
  if (metrics.status === 'HALF_DAY') return { variant: 'warning', label: 'Half Day Pending' };
  if (metrics.status === 'ABSENT') return { variant: 'danger', label: 'Absent' };
  return { variant: 'neutral', label: 'On break' };
}

// 'HH:mm' -> din ke minute
export const minutesOfTime = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
