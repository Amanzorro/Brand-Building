/* Nokhada Workbench — unit handling.
   Every conversion is explicit and listed here. A unit that could mean two
   different things (for example "gal") is reported as ambiguous and never guessed. */

/* Canonical units: each dimension converts to its base unit by `toBase`. */
export const UNITS = {
  kWh: { dim: "energy", toBase: 1, label: "kWh" },
  MWh: { dim: "energy", toBase: 1000, label: "MWh" },
  GWh: { dim: "energy", toBase: 1000000, label: "GWh" },
  RTh: { dim: "cooling", toBase: 1, label: "RTh (refrigeration ton-hours)" },
  L: { dim: "volume", toBase: 1, label: "litres" },
  m3: { dim: "volume", toBase: 1000, label: "m³" },
  "US gal": { dim: "volume", toBase: 3.785411784, label: "US gallons" },
  "imp gal": { dim: "volume", toBase: 4.54609, label: "imperial gallons" },
  kg: { dim: "mass", toBase: 1, label: "kg" },
  t: { dim: "mass", toBase: 1000, label: "tonnes" },
  lb: { dim: "mass", toBase: 0.45359237, label: "pounds" }
};

const ALIASES = {
  kwh: "kWh", "kw h": "kWh", "kw-h": "kWh", "kw.h": "kWh", "kilowatt hour": "kWh", "kilowatt hours": "kWh", "kilowatt-hours": "kWh", "كيلوواط ساعة": "kWh", "ك.و.س": "kWh",
  mwh: "MWh", "megawatt hour": "MWh", "megawatt hours": "MWh",
  gwh: "GWh",
  rth: "RTh", "ton-hour": "RTh", "ton-hours": "RTh", "ton hour": "RTh", "ton hours": "RTh", tonhours: "RTh", trh: "RTh", "tr-h": "RTh", "tr h": "RTh", "tr.h": "RTh", "refrigeration ton-hours": "RTh", "refrigeration ton hours": "RTh", "طن تبريد ساعة": "RTh",
  l: "L", litre: "L", litres: "L", liter: "L", liters: "L", ltr: "L", ltrs: "L", "لتر": "L",
  m3: "m3", "cubic metre": "m3", "cubic metres": "m3", "cubic meter": "m3", "cubic meters": "m3", "cu m": "m3", "متر مكعب": "m3",
  "us gal": "US gal", usgal: "US gal", "us gallon": "US gal", "us gallons": "US gal", "gal (us)": "US gal", "gallon (us)": "US gal", "gallons (us)": "US gal", "غالون أمريكي": "US gal",
  "imp gal": "imp gal", impgal: "imp gal", "imperial gallon": "imp gal", "imperial gallons": "imp gal", ig: "imp gal", "uk gal": "imp gal", "gal (imp)": "imp gal", "gallon (imperial)": "imp gal", "gallons (imperial)": "imp gal", "غالون إمبراطوري": "imp gal",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg", "كغ": "kg", "كجم": "kg",
  t: "t", tonne: "t", tonnes: "t", "metric ton": "t", "metric tons": "t", "metric tonne": "t",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb"
};

const AMBIGUOUS = {
  gal: "US or imperial gallons",
  gallon: "US or imperial gallons",
  gallons: "US or imperial gallons",
  "غالون": "US or imperial gallons",
  ton: "tonnes of mass or refrigeration ton-hours",
  tons: "tonnes of mass or refrigeration ton-hours",
  tr: "refrigeration tons (a rate) or ton-hours (an amount)"
};

function key(raw) {
  return String(raw == null ? "" : raw).trim().toLowerCase().replace(/³/g, "3").replace(/\s+/g, " ");
}

/* Returns { ok: true, unit } with a canonical unit, or { ok: false, reason, message }. */
export function normaliseUnit(raw) {
  const k = key(raw);
  if (!k) return { ok: false, reason: "missing", message: "No unit given." };
  if (UNITS[raw]) return { ok: true, unit: raw };
  if (ALIASES[k]) return { ok: true, unit: ALIASES[k] };
  if (AMBIGUOUS[k]) return { ok: false, reason: "ambiguous", message: "“" + String(raw).trim() + "” could mean " + AMBIGUOUS[k] + "." };
  return { ok: false, reason: "unrecognised", message: "“" + String(raw).trim() + "” is not a unit the Workbench knows." };
}

export function dimensionOf(unit) {
  const n = normaliseUnit(unit);
  return n.ok ? UNITS[n.unit].dim : null;
}

/* Converts `value` from one unit to another. Returns
   { ok: true, value, multiplier, from, to } or { ok: false, message }. */
export function convert(value, from, to) {
  const a = normaliseUnit(from);
  if (!a.ok) return { ok: false, message: a.message };
  const b = normaliseUnit(to);
  if (!b.ok) return { ok: false, message: b.message };
  const ua = UNITS[a.unit];
  const ub = UNITS[b.unit];
  if (ua.dim !== ub.dim) {
    return { ok: false, message: ua.label + " can't be converted to " + ub.label + "." };
  }
  const multiplier = ua.toBase / ub.toBase;
  return { ok: true, value: value * multiplier, multiplier, from: a.unit, to: b.unit };
}

/* The unit each source type is calculated in. Factors use the same unit. */
export const CANONICAL_UNIT = {
  electricity: "kWh",
  district_cooling: "RTh",
  diesel: "L",
  petrol: "L",
  generator_diesel: "L",
  refrigerant: "kg",
  water: "m3"
};

/* Converts a row's quantity to its source type's canonical unit. */
export function toCanonical(quantity, unit, sourceType) {
  const target = CANONICAL_UNIT[sourceType];
  if (!target) return { ok: false, message: "Unknown source type “" + sourceType + "”." };
  const n = normaliseUnit(unit);
  if (!n.ok) return { ok: false, message: n.message };
  if (UNITS[n.unit].dim !== UNITS[target].dim) {
    return { ok: false, message: UNITS[n.unit].label + " is not a unit for " + sourceType.replace(/_/g, " ") + " (expected " + UNITS[target].label + ")." };
  }
  const c = convert(quantity, n.unit, target);
  return { ok: true, value: c.value, multiplier: c.multiplier, from: n.unit, to: target };
}
