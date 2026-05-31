import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Slider } from "./ui/slider";
import { Link } from "react-router-dom";

type ChallengeType = "normal" | "express" | "swing";

interface ChallengeRules {
  profitTarget: number;
  minTradingDays: number;
  maxLoss: number;
  maxDailyLoss: number;
  fee: number;
}

export const ChallengeCalculator = () => {
  const [accountSize, setAccountSize] = useState(50000);
  const [challengeType, setChallengeType] = useState<ChallengeType>("normal");

  const calculateRules = (): ChallengeRules => {
    const rules: Record<ChallengeType, ChallengeRules> = {
      normal: {
        profitTarget: 10,
        minTradingDays: 5,
        maxLoss: 10,
        maxDailyLoss: 5,
        fee: accountSize * 0.001,
      },
      express: {
        profitTarget: 8,
        minTradingDays: 0,
        maxLoss: 8,
        maxDailyLoss: 4,
        fee: accountSize * 0.0015,
      },
      swing: {
        profitTarget: 10,
        minTradingDays: 10,
        maxLoss: 10,
        maxDailyLoss: 5,
        fee: accountSize * 0.0012,
      },
    };

    return rules[challengeType];
  };

  const rules = calculateRules();

  return (
    <section className="py-20 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Configure Your <span className="text-gold">Challenge</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose your account size and challenge type to see the rules
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 bg-card/80 backdrop-blur-sm border-border">
            {/* Account Size Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <label className="text-lg font-semibold">Select Account Size</label>
                <span className="text-2xl font-bold text-gold">
                  €{accountSize.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[accountSize]}
                onValueChange={(value) => setAccountSize(value[0])}
                min={10000}
                max={200000}
                step={10000}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>€10,000</span>
                <span>€200,000</span>
              </div>
            </div>

            {/* Challenge Type Selection */}
            <div className="mb-8">
              <label className="text-lg font-semibold mb-4 block">Select Challenge Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["normal", "express", "swing"] as ChallengeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChallengeType(type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      challengeType === type
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <div className="text-lg font-semibold capitalize mb-1">{type}</div>
                    <div className="text-sm text-muted-foreground">
                      {type === "normal" && "Standard challenge"}
                      {type === "express" && "No minimum days"}
                      {type === "swing" && "For swing traders"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge Rules Display */}
            <motion.div
              key={`${accountSize}-${challengeType}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-primary/10 rounded-lg p-6 mb-6"
            >
              <h3 className="text-xl font-bold mb-4">Challenge Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Profit Target:</span>
                  <span className="font-bold text-gold">{rules.profitTarget}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Min Trading Days:</span>
                  <span className="font-bold">{rules.minTradingDays} days</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Maximum Loss:</span>
                  <span className="font-bold text-destructive">{rules.maxLoss}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Max Daily Loss:</span>
                  <span className="font-bold text-destructive">{rules.maxDailyLoss}%</span>
                </div>
              </div>
            </motion.div>

            {/* Summary and CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gold/10 rounded-lg border border-gold/30">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Registration Fee</div>
                <div className="text-3xl font-bold text-gold">€{rules.fee.toFixed(0)}</div>
              </div>
              <Link to="/auth">
                <Button variant="hero" size="lg">
                  Get Funded Now
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
