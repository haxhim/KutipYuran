import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { permissions } from "@/modules/authz/permissions";
import { listAuditLogs } from "@/modules/audit/audit.service";
import { requireTenantPermission } from "@/modules/tenant/tenant-context";

export default async function AuditLogsPage() {
  const tenant = await requireTenantPermission(permissions.viewAuditLogs);
  const logs = await listAuditLogs(tenant.organizationId, { limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Tenant-scoped operational audit trail for administrative and system events.</p>
      </div>

      <Card>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription className="mt-2">
          This is the foundation view for auditability. Filtering by action, entity, and actor can be layered on next.
        </CardDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-b align-top">
                    <td className="py-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user?.fullName || log.actorType}</td>
                    <td>{log.action}</td>
                    <td>
                      {log.entityType}
                      {log.entityId ? ` (${log.entityId})` : ""}
                    </td>
                    <td className="max-w-md whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata) : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-muted-foreground" colSpan={5}>
                    No audit records yet for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
