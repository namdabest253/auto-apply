export interface GreenhouseCompany {
  slug: string;
  name: string;
}

export const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  // Original 23 companies
  { slug: "stripe", name: "Stripe" },
  { slug: "airbnb", name: "Airbnb" },
  { slug: "coinbase", name: "Coinbase" },
  { slug: "figma", name: "Figma" },
  { slug: "gitlab", name: "GitLab" },
  { slug: "airtable", name: "Airtable" },
  { slug: "discord", name: "Discord" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "databricks", name: "Databricks" },
  { slug: "squarespace", name: "Squarespace" },
  { slug: "hubspot", name: "HubSpot" },
  { slug: "brex", name: "Brex" },
  { slug: "gusto", name: "Gusto" },
  { slug: "duolingo", name: "Duolingo" },
  { slug: "flexport", name: "Flexport" },
  { slug: "verkada", name: "Verkada" },
  { slug: "relativity", name: "Relativity" },
  { slug: "watershed", name: "Watershed" },
  { slug: "andurilindustries", name: "Anduril" },
  { slug: "doordashusa", name: "DoorDash" },
  { slug: "scaleai", name: "Scale AI" },
  { slug: "twilio", name: "Twilio" },
  { slug: "roblox", name: "Roblox" },
  // Expanded companies (37 additional)
  { slug: "spacex", name: "SpaceX" },
  { slug: "rubrik", name: "Rubrik" },
  { slug: "roku", name: "Roku" },
  { slug: "purestorage", name: "Pure Storage" },
  { slug: "togetherai", name: "Together AI" },
  { slug: "sigmacomputing", name: "Sigma Computing" },
  { slug: "affirm", name: "Affirm" },
  { slug: "gleanwork", name: "Glean" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "pinterest", name: "Pinterest" },
  { slug: "lyft", name: "Lyft" },
  { slug: "instacart", name: "Instacart" },
  { slug: "dropbox", name: "Dropbox" },
  { slug: "robinhood", name: "Robinhood" },
  { slug: "chime", name: "Chime" },
  { slug: "datadog", name: "Datadog" },
  { slug: "mongodb", name: "MongoDB" },
  { slug: "reddit", name: "Reddit" },
  { slug: "grammarly", name: "Grammarly" },
  { slug: "elastic", name: "Elastic" },
  { slug: "samsara", name: "Samsara" },
  { slug: "nuro", name: "Nuro" },
  { slug: "waymo", name: "Waymo" },
  { slug: "lucidmotors", name: "Lucid Motors" },
  { slug: "toast", name: "Toast" },
  { slug: "postman", name: "Postman" },
  { slug: "cockroachlabs", name: "Cockroach Labs" },
  { slug: "temporaltechnologies", name: "Temporal" },
  { slug: "asana", name: "Asana" },
  { slug: "amplitude", name: "Amplitude" },
  { slug: "unity3d", name: "Unity" },
  { slug: "epicgames", name: "Epic Games" },
  { slug: "riotgames", name: "Riot Games" },
  { slug: "twitch", name: "Twitch" },
  { slug: "block", name: "Block" },
  { slug: "pagerduty", name: "PagerDuty" },
  { slug: "aquaticcapitalmanagement", name: "Aquatic Capital" },
];

export interface WorkdayCompany {
  slug: string;
  name: string;
  domain: string;
  site: string;
}

// Workday career sites — verified CXS API endpoints.
// slug must be lowercase (matching subdomain). site is the career site ID (case-sensitive).
export const WORKDAY_COMPANIES: WorkdayCompany[] = [
  { slug: "capitalone", name: "Capital One", domain: "capitalone.wd12.myworkdayjobs.com", site: "Capital_One" },
  { slug: "boeing", name: "Boeing", domain: "boeing.wd1.myworkdayjobs.com", site: "External_Careers" },
  { slug: "salesforce", name: "Salesforce", domain: "salesforce.wd12.myworkdayjobs.com", site: "External_Career_Site" },
  { slug: "intel", name: "Intel", domain: "intel.wd1.myworkdayjobs.com", site: "External" },
  { slug: "accenture", name: "Accenture", domain: "accenture.wd103.myworkdayjobs.com", site: "AccentureCareers" },
  { slug: "adobe", name: "Adobe", domain: "adobe.wd5.myworkdayjobs.com", site: "external_experienced" },
  { slug: "pwc", name: "PwC", domain: "pwc.wd3.myworkdayjobs.com", site: "US_Experienced_Careers" },
  { slug: "mastercard", name: "Mastercard", domain: "mastercard.wd1.myworkdayjobs.com", site: "CorporateCareers" },
  { slug: "workday", name: "Workday", domain: "workday.wd5.myworkdayjobs.com", site: "Workday" },
  { slug: "crowdstrike", name: "CrowdStrike", domain: "crowdstrike.wd5.myworkdayjobs.com", site: "crowdstrikecareers" },
  { slug: "warnerbros", name: "Warner Bros", domain: "warnerbros.wd5.myworkdayjobs.com", site: "global" },
  { slug: "spgi", name: "S&P Global", domain: "spgi.wd5.myworkdayjobs.com", site: "SPGI_Careers" },
];

export interface LeverCompany {
  slug: string;
  name: string;
}

export const LEVER_COMPANIES: LeverCompany[] = [
  { slug: "palantir", name: "Palantir" },
  { slug: "spotify", name: "Spotify" },
  { slug: "atlassian", name: "Atlassian" },
  { slug: "plaid", name: "Plaid" },
  { slug: "brilliant", name: "Brilliant" },
  { slug: "wealthsimple", name: "Wealthsimple" },
  { slug: "voleon", name: "The Voleon Group" },
  { slug: "anyscale", name: "Anyscale" },
  { slug: "stackadapt", name: "StackAdapt" },
  { slug: "zoox", name: "Zoox" },
  { slug: "color", name: "Color Health" },
  { slug: "lever", name: "Lever" },
  { slug: "theathletic", name: "The Athletic" },
  { slug: "saviynt", name: "Saviynt" },
  { slug: "pyka", name: "Pyka" },
  { slug: "weride", name: "WeRide" },
  { slug: "sep", name: "SEP" },
  { slug: "solopulseco", name: "SoloPulse" },
];
