import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { ChallengeCalculator } from "@/components/ChallengeCalculator";
import { LiveStats } from "@/components/LiveStats";
import { CompetitorComparison } from "@/components/CompetitorComparison";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp, Clock, Shield, Award } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Up to 90% Profit Split",
    description: "Keep up to 90% of your trading profits",
  },
  {
    icon: Clock,
    title: "<24h Payouts",
    description: "Lightning-fast withdrawals processed daily",
  },
  {
    icon: Shield,
    title: "EU Regulated",
    description: "Fully compliant with European standards",
  },
  {
    icon: Award,
    title: "€200K Max Funding",
    description: "Scale your account to €200,000",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <LiveStats />
      <ChallengeCalculator />
      <CompetitorComparison />
      
      {/* Why Choose Us Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-gold">Universal Stock Trade</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              The European choice for funded trading
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-6 bg-card border-border hover:border-gold/50 transition-all duration-300 h-full">
                  <div className="bg-gold/20 rounded-lg p-3 w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* Live Payouts Feed */}
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
              Recent <span className="text-gold">Payouts</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Real-time payouts to our funded traders
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-card border-border">
              <div className="space-y-4">
                {[
                  { user: "User***775", amount: "€5,600", time: "2 minutes ago" },
                  { user: "User***342", amount: "€12,450", time: "15 minutes ago" },
                  { user: "User***891", amount: "€8,200", time: "1 hour ago" },
                  { user: "User***124", amount: "€3,750", time: "2 hours ago" },
                  { user: "User***567", amount: "€15,900", time: "3 hours ago" },
                ].map((payout, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-background/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold">{payout.user}</span>
                      <span className="text-muted-foreground">withdrew</span>
                      <span className="text-gold font-bold">{payout.amount}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{payout.time}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-primary/10 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Universal Stock Trade</h3>
              <p className="text-sm text-muted-foreground">
                EU-regulated proprietary trading firm funding skilled traders across Europe.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/challenge" className="hover:text-gold transition-colors">Challenges</a></li>
                <li><a href="/about" className="hover:text-gold transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-gold transition-colors">Contact</a></li>
                <li><a href="/auth" className="hover:text-gold transition-colors">Get Funded</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-gold transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Risk Disclosure</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: support@universalstocktrade.eu</li>
                <li>24/7 Live Chat</li>
                <li>Response time: {"<"}2 hours</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Universal Stock Trade. All rights reserved. EU Regulated Trading Firm.</p>
          </div>
        </div>
      </footer>

      <WhatsAppWidget />
    </div>
  );
};

export default Index;
