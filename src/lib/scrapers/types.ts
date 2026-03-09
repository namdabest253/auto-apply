export interface ScraperAdapter {
  platform: string;
  discover(params: SearchParams): Promise<DiscoveredJob[]>;
}

export interface SearchParams {
  keywords: string[];
  locations: string[];
  roleTypes: string[];
}

export interface DiscoveredJob {
  externalUrl: string;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  datePosted: Date | null;
  descriptionHtml: string | null;
  descriptionText: string | null;
  salary: string | null;
  metadata: Record<string, unknown>;
}
