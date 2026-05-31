import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CopyTradingConfig } from "@/pages/admin/AdminCopyTrading";

interface StatusCardProps {
  config: CopyTradingConfig;
  onToggleMode: () => void;
}

export const CopyTradingStatusCard = ({ config, onToggleMode }: StatusCardProps) => {
  const isManual = config.mode === "manual_override";

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-4">Current Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Current Mode</p>
          <p className="font-medium">{isManual ? "Manual Override" : "Default Random"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Active Since</p>
          <p className="font-medium">{format(new Date(config.active_since), "MMM d, yyyy HH:mm")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Last Updated</p>
          <p className="font-medium">{format(new Date(config.updated_at), "MMM d, yyyy HH:mm")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Auto-Randomization</p>
          <p className="font-medium">
            {config.auto_randomization_enabled
              ? `Every ${config.auto_randomization_interval_minutes} min`
              : "Disabled"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={isManual ? "outline" : "default"} className={isManual ? "" : "bg-blue-600 hover:bg-blue-700"}>
              {isManual ? "Revert to Default Random" : "Switch to Manual Override"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {isManual ? "Revert to Default Random?" : "Enable Manual Override?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isManual
                  ? "The system will return to pre-configured profit/loss ranges. All manual settings will be saved but inactive."
                  : "You are about to override the default random system. All new trades will follow your custom settings. Existing active trades will not be affected."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onToggleMode}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
