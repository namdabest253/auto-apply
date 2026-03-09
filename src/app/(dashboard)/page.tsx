import { Badge } from "@/components/ui/badge"
import { getJobs, getLatestScrapeRun, getGreenhouseCompanies } from "./actions"
import { JobsTable } from "./components/jobs-table"
import { ScrapeStatusBar } from "./components/scrape-status-bar"
import { GreenhouseConfig } from "./components/greenhouse-config"
import { DiscoverButton } from "./components/discover-button"

export default async function DashboardPage() {
  const [jobs, latestRun, greenhouseCompanies] = await Promise.all([
    getJobs(),
    getLatestScrapeRun(),
    getGreenhouseCompanies(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">Jobs</h1>
          <Badge variant="secondary">{jobs.length}</Badge>
        </div>
        <DiscoverButton />
      </div>

      <ScrapeStatusBar
        initialRun={
          latestRun
            ? {
                id: latestRun.id,
                status: latestRun.status,
                platforms: latestRun.platforms,
                jobsFound: latestRun.jobsFound,
                errors: latestRun.errors,
                startedAt: latestRun.startedAt.toISOString(),
                completedAt: latestRun.completedAt?.toISOString() ?? null,
                duration: latestRun.duration,
              }
            : null
        }
      />

      <JobsTable initialJobs={jobs} />

      <div className="pt-4">
        <GreenhouseConfig initialCompanies={greenhouseCompanies} />
      </div>
    </div>
  )
}
