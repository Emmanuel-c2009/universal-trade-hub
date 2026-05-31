import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { ChallengeCalculator } from "@/components/ChallengeCalculator";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const challengeFeatures = [
  "No minimum trading days on Express challenges",
  "Trade weekends on all instruments",
  "Hold trades through news events",
  "Scale up to €200,000 in funding",
  "90% profit split available",
  "24/7 support from professional traders",
  "Lightning-fast payouts under 24 hours",
  "Trade Forex, Crypto, Stocks, Commodities",
];

export default function Challenge() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <WhatsAppWidget />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Choose Your <span className="text-gold">Challenge</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select the challenge that fits your trading style and get funded in under 24 hours
            </p>
          </motion.div>

          <ChallengeCalculator />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20"
          >
            <h2 className="text-3xl font-bold text-center mb-8">
              Challenge <span className="text-gold">Features</span>
            </h2>
            <Card className="p-8 bg-card/80 backdrop-blur-sm border-border max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-4">
                {challengeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
                    <div className="bg-gold/20 rounded-full p-1 mt-1">
                      <Check className="w-4 h-4 text-gold" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
