/* Nokhada Workbench — extractors.
   An extractor turns source material into Workbench rows. Every extractor has the
   same shape, so the rest of the Workbench (review, factors, Sieve, results) never
   needs to know where the rows came from:

     {
       id: string,
       label: string,
       async extract(input) → {
         rows: Row[],            // the columns in rows.js COLUMNS, plus origin
         documents: Document[],  // { id, title, lang, html } for the source viewer
         warnings: string[]
       }
     }

   Each row's `origin` says where it came from: { kind: "document", doc, field },
   { kind: "csv", file, line, raw } or { kind: "manual" }.

   This edition has one extractor, demoExtractor, which returns the demo pack's
   pre-extracted rows. It runs no model and makes no network calls.

   Where a future Claude-based extractor would plug in (not built):
   - It would implement this same interface, taking the user's files (PDF bills,
     scanned delivery notes, spreadsheets) as `input`.
   - The model call would run on a server the client controls, inside their own
     environment, so no API key is ever placed in the browser.
   - It would return rows in exactly this shape, with `origin.kind = "document"`,
     the page and the quoted text each value was read from, so the trace still
     ends at the source.
   - Every extracted row would land in the Review step unconfirmed and pass through
     the same deterministic Sieve checks as the demo and CSV rows. */
import { DOCUMENTS, demoRows } from "./demo-pack.js";

export const demoExtractor = {
  id: "demo",
  label: "Demo pack (rows extracted in advance)",
  async extract() {
    return { rows: demoRows(), documents: DOCUMENTS.slice(), warnings: [] };
  }
};

export const EXTRACTORS = [demoExtractor];
