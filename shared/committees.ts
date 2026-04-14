/**
 * Single source of truth for EU Parliament committee configuration.
 * Used by both client and server via the @shared alias.
 *
 * To add a new committee, add one entry here. No other files need editing.
 * Active committees: 6 (MVP - 14 April 2026)
 */

export interface CommitteeConfig {
  /** EU committee abbreviation (e.g. "ITRE") - used as the key throughout the app */
  abbreviation: string;
  /** URL slug */
  slug: string;
  /** Full official name */
  name: string;
  /** Short display name for UI labels and navigation */
  shortName: string;
  /** Tailwind background colour class */
  color: string;
  /** Keywords used to detect this committee in a search query */
  keywords: string[];
  /** Target legislative file this committee handles (MVP only) */
  targetFile?: string;
}

export const COMMITTEES: CommitteeConfig[] = [
  {
    abbreviation: "ITRE",
    slug: "itre",
    name: "Committee on Industry, Research and Energy",
    shortName: "Industry & Energy",
    color: "bg-blue-600",
    keywords: ["industry", "research", "energy", "itre", "digital", "innovation", "ai act", "artificial intelligence"],
    targetFile: "AI Act (responsible)",
  },
  {
    abbreviation: "IMCO",
    slug: "imco",
    name: "Committee on the Internal Market and Consumer Protection",
    shortName: "Internal Market",
    color: "bg-orange-600",
    keywords: ["internal market", "consumer", "imco", "digital markets", "dma", "single market"],
    targetFile: "Digital Markets Act (responsible)",
  },
  {
    abbreviation: "JURI",
    slug: "juri",
    name: "Committee on Legal Affairs",
    shortName: "Legal Affairs",
    color: "bg-purple-600",
    keywords: ["legal", "juri", "liability", "due diligence", "csddd", "corporate sustainability"],
    targetFile: "CSDDD (responsible)",
  },
  {
    abbreviation: "LIBE",
    slug: "libe",
    name: "Committee on Civil Liberties, Justice and Home Affairs",
    shortName: "Civil Liberties",
    color: "bg-red-600",
    keywords: ["civil liberties", "justice", "libe", "fundamental rights", "data protection", "privacy", "migration"],
    targetFile: "AI Act (opinion)",
  },
  {
    abbreviation: "ECON",
    slug: "econ",
    name: "Committee on Economic and Monetary Affairs",
    shortName: "Economic Affairs",
    color: "bg-emerald-600",
    keywords: ["economic", "monetary", "econ", "banking", "finance", "fiscal", "euro", "ecb"],
  },
  {
    abbreviation: "ENVI",
    slug: "envi",
    name: "Committee on the Environment, Public Health and Food Safety",
    shortName: "Environment",
    color: "bg-green-600",
    keywords: ["environment", "envi", "climate", "health", "food safety", "green deal", "emissions", "packaging"],
  },
];

/**
 * EU Parliament committees not in the MVP scope.
 * Shown in the sidebar as "available in future".
 */
export const OTHER_COMMITTEES: { abbreviation: string; name: string; shortName: string }[] = [
  { abbreviation: "AFET", name: "Committee on Foreign Affairs", shortName: "Foreign Affairs" },
  { abbreviation: "DEVE", name: "Committee on Development", shortName: "Development" },
  { abbreviation: "INTA", name: "Committee on International Trade", shortName: "Int'l Trade" },
  { abbreviation: "BUDG", name: "Committee on Budgets", shortName: "Budgets" },
  { abbreviation: "CONT", name: "Committee on Budgetary Control", shortName: "Budgetary Control" },
  { abbreviation: "EMPL", name: "Committee on Employment and Social Affairs", shortName: "Employment" },
  { abbreviation: "TRAN", name: "Committee on Transport and Tourism", shortName: "Transport" },
  { abbreviation: "REGI", name: "Committee on Regional Development", shortName: "Regional Dev" },
  { abbreviation: "AGRI", name: "Committee on Agriculture and Rural Development", shortName: "Agriculture" },
  { abbreviation: "PECH", name: "Committee on Fisheries", shortName: "Fisheries" },
  { abbreviation: "CULT", name: "Committee on Culture and Education", shortName: "Culture & Education" },
  { abbreviation: "AFCO", name: "Committee on Constitutional Affairs", shortName: "Constitutional" },
  { abbreviation: "FEMM", name: "Committee on Women's Rights and Gender Equality", shortName: "Women's Rights" },
  { abbreviation: "PETI", name: "Committee on Petitions", shortName: "Petitions" },
];

// ---------------------------------------------------------------------------
// EU Political Groups
// ---------------------------------------------------------------------------

export interface PoliticalGroupConfig {
  abbreviation: string;
  name: string;
  color: string;
}

export const POLITICAL_GROUPS: PoliticalGroupConfig[] = [
  { abbreviation: "EPP", name: "European People's Party", color: "bg-blue-600" },
  { abbreviation: "S&D", name: "Progressive Alliance of Socialists and Democrats", color: "bg-red-600" },
  { abbreviation: "Renew", name: "Renew Europe", color: "bg-yellow-500" },
  { abbreviation: "Greens/EFA", name: "Greens/European Free Alliance", color: "bg-green-600" },
  { abbreviation: "ECR", name: "European Conservatives and Reformists", color: "bg-sky-700" },
  { abbreviation: "ID", name: "Identity and Democracy", color: "bg-indigo-800" },
  { abbreviation: "The Left", name: "The Left in the European Parliament", color: "bg-rose-700" },
  { abbreviation: "NI", name: "Non-Inscrits", color: "bg-gray-500" },
];

// ---------------------------------------------------------------------------
// Derived lookup maps
// ---------------------------------------------------------------------------

/** Map of abbreviation → full CommitteeConfig */
export const COMMITTEE_BY_ABBR: Record<string, CommitteeConfig> = Object.fromEntries(
  COMMITTEES.map((c) => [c.abbreviation, c])
);

/** Map of slug → full CommitteeConfig */
export const COMMITTEE_BY_SLUG: Record<string, CommitteeConfig> = Object.fromEntries(
  COMMITTEES.map((c) => [c.slug, c])
);

/** Map of full name → full CommitteeConfig */
export const COMMITTEE_BY_NAME: Record<string, CommitteeConfig> = Object.fromEntries(
  COMMITTEES.map((c) => [c.name, c])
);

/** Map of full name → Tailwind colour class */
export const COMMITTEE_COLORS: Record<string, string> = Object.fromEntries(
  COMMITTEES.map((c) => [c.name, c.color])
);

/** Map of full name → short display name */
export const COMMITTEE_SHORT: Record<string, string> = Object.fromEntries(
  COMMITTEES.map((c) => [c.name, c.shortName])
);

/** Ordered list of active committee abbreviations */
export const ACTIVE_COMMITTEE_ABBRS: string[] = COMMITTEES.map((c) => c.abbreviation);

/** Map of political group abbreviation → colour */
export const GROUP_COLORS: Record<string, string> = Object.fromEntries(
  POLITICAL_GROUPS.map((g) => [g.abbreviation, g.color])
);

/** Map of political group abbreviation → full name */
export const GROUP_NAMES: Record<string, string> = Object.fromEntries(
  POLITICAL_GROUPS.map((g) => [g.abbreviation, g.name])
);
