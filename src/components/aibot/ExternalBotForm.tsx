import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { aiBotService } from "@/services/aiBotService";

interface ExternalBotFormProps {
  userId: string;
}

export const ExternalBotForm = ({ userId }: ExternalBotFormProps) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter a license key");
      return;
    }

    setIsSubmitting(true);
    
    const success = await aiBotService.submitExternalBotRequest(userId, licenseKey);
    
    setIsSubmitting(false);
    
    if (success) {
      setSubmitted(true);
      toast.success("Request submitted! An admin will review your bot activation.");
    } else {
      toast.error("Failed to submit request. Please try again.");
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="font-bold text-lg mb-2">Request Submitted</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Your external bot activation request is pending admin approval.
            You'll be notified once it's reviewed.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setLicenseKey("");
            }}
          >
            Submit Another Request
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">External AI Bot Activation</h3>
          <p className="text-sm text-muted-foreground">
            Have a third-party AI bot? Enter your license key below
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="license-key">License Key</Label>
          <Input
            id="license-key"
            placeholder="Enter your AI bot license key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            External bots require admin approval before activation.
            The review process typically takes 24-48 hours.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !licenseKey.trim()}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Submitting..." : "Activate & Request Approval"}
        </Button>
      </div>
    </motion.div>
  );
};
