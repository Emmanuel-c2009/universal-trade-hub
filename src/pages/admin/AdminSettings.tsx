import { Card, CardContent } from "@/components/ui/card";

export const AdminSettings = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure platform settings and preferences
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            System settings will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
