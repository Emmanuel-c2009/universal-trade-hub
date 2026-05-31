import { motion } from "framer-motion";
import { Check, X, Crown } from "lucide-react";
import { Card } from "./ui/card";

interface ComparisonFeature {
  name: string;
  universal: string | boolean;
  competitor1: string | boolean;
  competitor2: string | boolean;
  competitor3: string | boolean;
}

const comparisonData: ComparisonFeature[] = [
  {
    name: "Payout Speed",
    universal: "<24 hours",
    competitor1: "3-5 days",
    competitor2: "7-14 days",
    competitor3: "5-7 days"
  },
  {
    name: "Max Funding",
    universal: "€200,000",
    competitor1: "€100,000",
    competitor2: "€150,000",
    competitor3: "€100,000"
  },
  {
    name: "Profit Split",
    universal: "Up to 90%",
    competitor1: "Up to 80%",
    competitor2: "Up to 85%",
    competitor3: "Up to 75%"
  },
  {
    name: "EU Regulated",
    universal: true,
    competitor1: false,
    competitor2: false,
    competitor3: false
  },
  {
    name: "Weekend Holding",
    universal: true,
    competitor1: false,
    competitor2: true,
    competitor3: false
  },
  {
    name: "News Trading",
    universal: true,
    competitor1: false,
    competitor2: false,
    competitor3: true
  },
  {
    name: "24/7 Support",
    universal: true,
    competitor1: false,
    competitor2: true,
    competitor3: false
  },
  {
    name: "Trading Instruments",
    universal: "200+",
    competitor1: "100+",
    competitor2: "150+",
    competitor3: "80+"
  },
  {
    name: "Minimum Trading Days",
    universal: "3 days",
    competitor1: "5 days",
    competitor2: "4 days",
    competitor3: "5 days"
  },
  {
    name: "Challenge Fee (€10k)",
    universal: "€99",
    competitor1: "€155",
    competitor2: "€129",
    competitor3: "€149"
  }
];

const renderValue = (value: string | boolean, isUniversal: boolean = false) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className={`w-5 h-5 ${isUniversal ? "text-gold" : "text-green-500"}`} />
    ) : (
      <X className="w-5 h-5 text-muted-foreground/50" />
    );
  }
  return (
    <span className={isUniversal ? "text-gold font-semibold" : "text-foreground"}>
      {value}
    </span>
  );
};

export const CompetitorComparison = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-gold" />
            <span className="text-gold font-semibold uppercase tracking-wider text-sm">
              Why Choose Us
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The Clear{" "}
            <span className="bg-gradient-to-r from-gold to-gold-glow bg-clip-text text-transparent">
              European Leader
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See why traders across Europe choose Universal Stock Trade over the competition
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-4 text-left font-semibold text-foreground">Feature</th>
                    <th className="p-4 text-center bg-gold/10 border-x border-gold/20">
                      <div className="flex flex-col items-center gap-2">
                        <Crown className="w-6 h-6 text-gold" />
                        <span className="font-bold text-gold text-lg">Universal Stock Trade</span>
                      </div>
                    </th>
                    <th className="p-4 text-center font-semibold text-muted-foreground">
                      Competitor A
                    </th>
                    <th className="p-4 text-center font-semibold text-muted-foreground">
                      Competitor B
                    </th>
                    <th className="p-4 text-center font-semibold text-muted-foreground">
                      Competitor C
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((feature, index) => (
                    <motion.tr
                      key={feature.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      viewport={{ once: true }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-medium text-foreground">{feature.name}</td>
                      <td className="p-4 text-center bg-gold/5 border-x border-gold/10">
                        <div className="flex justify-center">
                          {renderValue(feature.universal, true)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {renderValue(feature.competitor1)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {renderValue(feature.competitor2)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {renderValue(feature.competitor3)}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* EU Advantages Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="p-6 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-bold text-lg">EU Regulated</h3>
            </div>
            <p className="text-muted-foreground">
              Fully compliant with European financial regulations, ensuring your funds are protected.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue/10 to-blue/5 border-blue/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-blue" />
              </div>
              <h3 className="font-bold text-lg">Lightning Fast Payouts</h3>
            </div>
            <p className="text-muted-foreground">
              Get your profits in under 24 hours via SEPA transfers - the fastest in Europe.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg">Euro-Based Trading</h3>
            </div>
            <p className="text-muted-foreground">
              No currency conversion fees. Trade, earn, and withdraw in Euros seamlessly.
            </p>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};
