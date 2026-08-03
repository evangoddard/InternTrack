// -----------------------------------------------------------------------
// DATA LOADING — this is the one place that knows about data.json.
//
// This site has no backend and no database. All posting data is baked in
// at build time from `web/data.json` (see that file for the exact shape).
//
// TO WIRE IN REAL DATA: overwrite `web/data.json` with your scraper's
// output (matching the `TrackData` shape in `lib/types.ts`) and rebuild.
// Nothing else in this app needs to change.
// -----------------------------------------------------------------------

import raw from "@/data.json";
import type { TrackData } from "./types";

export const trackData: TrackData = raw as TrackData;

export const { stats, postings } = trackData;
