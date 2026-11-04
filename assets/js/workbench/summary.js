/* Nokhada Workbench — short summaries built from fixed templates.
   Only the engine's numbers are inserted; no sentence is generated freely.
   The Arabic template needs review by a native speaker before any real use. */
import { fmt, fmtPeriod } from "./util.js";

function countStatuses(factorsUsed) {
  const c = { cited: 0, placeholder: 0, "user-supplied": 0 };
  factorsUsed.forEach((f) => { if (f && c[f.status] !== undefined) c[f.status] += 1; });
  return c;
}

/* data: { company, period, run } where run is engine.run()'s output */
export function summaryEN({ company, period, run }) {
  const { result, effects, factorsUsed } = run;
  const s1 = result.byScope[0].t;
  const s2 = result.byScope[1].t;
  const c = countStatuses(factorsUsed);
  const sites = result.bySite.filter((s) => s.rowIds.length).length;
  const est = result.rows.filter((r) => r.status === "included" && r.estimate).length;
  const who = company ? company : "This organisation";
  const parts = [];
  parts.push(who + " emitted " + fmt(result.total.t, 1) + " tCO₂e in Scope 1 and Scope 2 (location-based) for " + fmtPeriod(period.start, period.end) + ": " + fmt(s1, 1) + " t in Scope 1 and " + fmt(s2, 1) + " t in Scope 2.");
  parts.push("The figures come from " + result.counts.included + " rows across " + sites + (sites === 1 ? " site" : " sites") + ", using " + c.cited + " cited, " + c.placeholder + " placeholder and " + c["user-supplied"] + " user-supplied factors" + (est ? ", and " + est + (est === 1 ? " row is an estimate." : " rows are estimates.") : "."));
  if (effects.provisional) {
    parts.push("These totals are provisional: " + effects.pending.length + " open " + (effects.pending.length === 1 ? "decision" : "decisions") + " and " + effects.errors.length + (effects.errors.length === 1 ? " problem" : " problems") + " that stop rows being calculated.");
  } else {
    parts.push("No Sieve decisions are open and every row in scope was calculated.");
  }
  return parts.join(" ");
}

export function summaryAR({ company_ar, period, run }) {
  const { result, effects, factorsUsed } = run;
  const s1 = result.byScope[0].t;
  const s2 = result.byScope[1].t;
  const c = countStatuses(factorsUsed);
  const est = result.rows.filter((r) => r.status === "included" && r.estimate).length;
  const who = company_ar ? "بلغت انبعاثات " + company_ar : "بلغت الانبعاثات";
  const parts = [];
  parts.push(who + " من النطاقين الأول والثاني (على أساس الموقع) " + fmt(result.total.t, 1) + " طن من مكافئ ثاني أكسيد الكربون للفترة من " + period.start + " إلى " + period.end + "، منها " + fmt(s1, 1) + " طن في النطاق الأول و" + fmt(s2, 1) + " طن في النطاق الثاني.");
  parts.push("عدد السجلات المحتسبة: " + result.counts.included + "، وعوامل الانبعاث المستخدمة: موثّقة " + c.cited + "، ومؤقتة " + c.placeholder + "، ومُدخلة من المستخدم " + c["user-supplied"] + (est ? "، والسجلات التقديرية: " + est : "") + ".");
  if (effects.provisional) {
    parts.push("هذه الأرقام أولية: عدد القرارات المعلّقة " + effects.pending.length + "، وعدد المشكلات التي تمنع احتساب بعض السجلات " + effects.errors.length + ".");
  } else {
    parts.push("لا توجد قرارات معلّقة، وجرى احتساب جميع السجلات ضمن النطاق.");
  }
  return parts.join(" ");
}
