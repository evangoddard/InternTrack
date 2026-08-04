// Shared shape of data.json. Edit this if you change the scraper's output
// schema — every component in this app imports types from here.

export interface Posting {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  date_posted: string; // ISO date string, e.g. "2026-08-03"
  deadline: string; // ISO date string, "" if unknown/rolling
  season: string; // e.g. "Fall 2026"
  source: string; // e.g. "Greenhouse", "Lever", "Ashby", "LinkedIn"
  category: string; // e.g. "Software", "Hardware", "AI/ML/Data" -- "" if the source doesn't set one
  degrees: string[]; // e.g. ["Bachelor's", "Master's"] -- [] if unset
}

export interface Stats {
  postings_tracked: number;
  sources: number;
  companies: number;
  last_updated: string; // ISO date string
}

export interface TrackData {
  stats: Stats;
  postings: Posting[];
}
