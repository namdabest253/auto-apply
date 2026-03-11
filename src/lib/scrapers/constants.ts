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

// Workday career sites. Domain format varies (wd1-wd5 subdomains).
// Some domains are best-effort guesses based on the {company}.wd5.myworkdayjobs.com pattern.
export const WORKDAY_COMPANIES: WorkdayCompany[] = [
  { slug: "Amazon", name: "Amazon", domain: "amazon.wd5.myworkdayjobs.com", site: "en-US/Amazon" },
  { slug: "JPMC", name: "JPMorgan Chase", domain: "jpmchase.wd5.myworkdayjobs.com", site: "en-US/JPMC" },
  { slug: "Disney", name: "Disney", domain: "disney.wd5.myworkdayjobs.com", site: "en-US/disneycareer" },
  { slug: "GoldmanSachs", name: "Goldman Sachs", domain: "gs.wd5.myworkdayjobs.com", site: "en-US/GoldmanSachs" },
  { slug: "BankofAmerica", name: "Bank of America", domain: "bankofa.wd1.myworkdayjobs.com", site: "en-US/BankofAmerica" },
  { slug: "Meta", name: "Meta", domain: "meta.wd5.myworkdayjobs.com", site: "en-US/Meta" },
  { slug: "Google", name: "Google", domain: "google.wd5.myworkdayjobs.com", site: "en-US/Google" },
  { slug: "Microsoft", name: "Microsoft", domain: "microsoft.wd5.myworkdayjobs.com", site: "en-US/Microsoft" },
  { slug: "Apple", name: "Apple", domain: "apple.wd5.myworkdayjobs.com", site: "en-US/Apple" },
  { slug: "Deloitte", name: "Deloitte", domain: "deloitte.wd5.myworkdayjobs.com", site: "en-US/Deloitte" },
  { slug: "PwC", name: "PwC", domain: "pwc.wd5.myworkdayjobs.com", site: "en-US/PwC" },
  { slug: "EY", name: "EY", domain: "ey.wd5.myworkdayjobs.com", site: "en-US/EY" },
  { slug: "KPMG", name: "KPMG", domain: "kpmg.wd5.myworkdayjobs.com", site: "en-US/KPMG" },
  { slug: "Accenture", name: "Accenture", domain: "accenture.wd3.myworkdayjobs.com", site: "en-US/Accenture" },
  { slug: "LockheedMartin", name: "Lockheed Martin", domain: "lockheedmartin.wd5.myworkdayjobs.com", site: "en-US/LockheedMartin" },
  { slug: "Raytheon", name: "Raytheon", domain: "rtx.wd1.myworkdayjobs.com", site: "en-US/Raytheon" },
  { slug: "Boeing", name: "Boeing", domain: "boeing.wd1.myworkdayjobs.com", site: "en-US/Boeing" },
  { slug: "NorthropGrumman", name: "Northrop Grumman", domain: "northropgrumman.wd5.myworkdayjobs.com", site: "en-US/NorthropGrumman" },
  { slug: "CapitalOne", name: "Capital One", domain: "capitalone.wd1.myworkdayjobs.com", site: "en-US/CapitalOne" },
  { slug: "Citibank", name: "Citibank", domain: "citi.wd5.myworkdayjobs.com", site: "en-US/Citi" },
  { slug: "WellsFargo", name: "Wells Fargo", domain: "wellsfargo.wd5.myworkdayjobs.com", site: "en-US/WellsFargo" },
  { slug: "MorganStanley", name: "Morgan Stanley", domain: "morganstanley.wd5.myworkdayjobs.com", site: "en-US/MorganStanley" },
  { slug: "PG", name: "Procter & Gamble", domain: "pg.wd5.myworkdayjobs.com", site: "en-US/PG" },
  { slug: "JNJ", name: "Johnson & Johnson", domain: "jnj.wd5.myworkdayjobs.com", site: "en-US/JNJ" },
  { slug: "Pfizer", name: "Pfizer", domain: "pfizer.wd1.myworkdayjobs.com", site: "en-US/Pfizer" },
  { slug: "GM", name: "General Motors", domain: "gm.wd5.myworkdayjobs.com", site: "en-US/GM" },
  { slug: "Ford", name: "Ford", domain: "ford.wd5.myworkdayjobs.com", site: "en-US/Ford" },
  { slug: "Tesla", name: "Tesla", domain: "tesla.wd5.myworkdayjobs.com", site: "en-US/Tesla" },
  { slug: "Intel", name: "Intel", domain: "intel.wd1.myworkdayjobs.com", site: "en-US/Intel" },
  { slug: "IBM", name: "IBM", domain: "ibm.wd5.myworkdayjobs.com", site: "en-US/IBM" },
  { slug: "Cisco", name: "Cisco", domain: "cisco.wd5.myworkdayjobs.com", site: "en-US/Cisco" },
  { slug: "Salesforce", name: "Salesforce", domain: "salesforce.wd1.myworkdayjobs.com", site: "en-US/Salesforce" },
  { slug: "Adobe", name: "Adobe", domain: "adobe.wd5.myworkdayjobs.com", site: "en-US/Adobe" },
  { slug: "Oracle", name: "Oracle", domain: "oracle.wd5.myworkdayjobs.com", site: "en-US/Oracle" },
  { slug: "SAP", name: "SAP", domain: "sap.wd5.myworkdayjobs.com", site: "en-US/SAP" },
  { slug: "Walmart", name: "Walmart", domain: "walmart.wd5.myworkdayjobs.com", site: "en-US/Walmart" },
  { slug: "Target", name: "Target", domain: "target.wd5.myworkdayjobs.com", site: "en-US/Target" },
  { slug: "HomeDepot", name: "Home Depot", domain: "homedepot.wd5.myworkdayjobs.com", site: "en-US/HomeDepot" },
  { slug: "UnitedHealth", name: "UnitedHealth", domain: "unitedhealth.wd5.myworkdayjobs.com", site: "en-US/UnitedHealth" },
  { slug: "Visa", name: "Visa", domain: "visa.wd5.myworkdayjobs.com", site: "en-US/Visa" },
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
