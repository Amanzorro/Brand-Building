/* Nokhada Workbench — runs the whole pipeline on a set of rows.
   rows + factors + decisions → Sieve findings → inventory. Pure, no DOM, so the
   page and the tests use exactly the same path. */
import { activityKey, chooseFactor } from "./factors.js";
import { runSieve, sieveEffects } from "./sieve.js";
import { calculate } from "./calc.js";

/* input: { rows, period, factors (all available), choices, decisions, thresholds } */
export function run(input) {
  const factors = input.factors || [];
  const choices = input.choices || {};
  const factorFor = (row) => chooseFactor(activityKey(row), factors, choices);
  const findings = runSieve(input.rows, { period: input.period, factorFor, thresholds: input.thresholds, decisions: input.decisions });
  const effects = sieveEffects(findings);
  const result = calculate(input.rows, { period: input.period, factorFor, skip: effects.skip });
  const used = new Map();
  result.rows.forEach((r) => {
    if (r.factorId && !used.has(r.factorId)) used.set(r.factorId, factors.find((f) => f.id === r.factorId));
  });
  return { findings, effects, result, factorFor, factorsUsed: [...used.values()] };
}
