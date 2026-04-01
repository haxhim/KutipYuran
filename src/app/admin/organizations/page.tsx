import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAdminMonitoringSnapshot } from "@/modules/admin/admin.service";

export default async function AdminOrganizationsPage() {
  const snapshot = await getAdminMonitoringSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">Recent tenant accounts, imports, and campaign activity at the platform level.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription className="mt-2">Newest tenants in the current admin snapshot.</CardDescription>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.organizations.map((organization) => (
              <div className="rounded-xl bg-muted p-3" key={organization.id}>
                <p className="font-medium">{organization.name}</p>
                <p className="text-muted-foreground">{organization.slug}</p>
                <p className="text-xs text-muted-foreground">Created {new Date(organization.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Import Jobs</CardTitle>
          <CardDescription className="mt-2">Latest tenant imports with success and failure counts.</CardDescription>
          <div className="mt-4 space-y-2 text-sm">
            {snapshot.importJobs.map((job) => (
              <div className="rounded-xl bg-muted p-3" key={job.id}>
                <p className="font-medium">{job.organization.name}</p>
                <p>{job.originalFileName}</p>
                <p className="text-muted-foreground">
                  Status: {job.status} | Success: {job.successRows} | Failed: {job.failedRows}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
