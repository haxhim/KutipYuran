import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardDescription>{title}</CardDescription>
      <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

