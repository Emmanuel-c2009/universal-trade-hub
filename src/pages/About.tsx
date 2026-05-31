import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { Card } from "@/components/ui/card";
import { Shield, Award, TrendingUp, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "EU Regulated",
    description: "Fully compliant with European financial regulations and standards",
  },
  {
    icon: Award,
    title: "Proven Track Record",
    description: "Over €10M paid out to traders across Europe",
  },
  {
    icon: TrendingUp,
    title: "Professional Growth",
    description: "Scale your account up to €200,000 with our progression program",
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Join thousands of funded traders in our exclusive community",
  },
];

export default function About() {
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
              About <span className="text-gold">Universal Stock Trade</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're a European proprietary trading firm committed to funding skilled traders and
              helping them achieve their financial goals.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <Card className="p-8 bg-card/80 backdrop-blur-sm border-border">
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-4">
                At Universal Stock Trade, we believe that talent and skill should be rewarded, not
                limited by capital. Our mission is to identify, fund, and support talented traders
                across Europe, providing them with the resources and capital they need to succeed in
                the financial markets.
              </p>
              <p className="text-lg text-muted-foreground">
                We operate with full transparency, offering competitive profit splits, fast payouts,
                and industry-leading support. Our traders are our partners, and their success is our
                success.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Choose <span className="text-gold">Us</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 bg-card border-border">
                  <div className="flex items-start gap-4">
                    <div className="bg-gold/20 rounded-lg p-3">
                      <feature.icon className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
