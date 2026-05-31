import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { TrendingUp, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Hero3DScene } from "./Hero3DScene";
import { Suspense } from "react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/20 to-background" />
      
      {/* 3D Scene Background */}
      <Suspense fallback={null}>
        <Hero3DScene />
      </Suspense>
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMDAsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: "1s" }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Trade The World.{" "}
              <span className="bg-gradient-to-r from-gold to-gold-glow bg-clip-text text-transparent">
                Get Funded in Euros.
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8"
          >
            EU-regulated, lightning-fast payouts under 24 hours, and capital up to €200,000.
          </motion.p>

          {/* Live Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-8 mb-12"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Live Traders: </span>
              <span className="text-foreground font-bold">1,247</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              <span className="text-muted-foreground">Last Payout: </span>
              <span className="text-gold font-bold">€5,600</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              <span className="text-muted-foreground">Payout Time: </span>
              <span className="text-secondary font-bold">{"<"}24h</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/challenge">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                Start Your Challenge
              </Button>
            </Link>
            <Link to="#testimonials">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Watch Success Stories
              </Button>
            </Link>
          </motion.div>

          {/* Live Payout Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border"
          >
            <div className="flex items-center justify-center gap-4 text-sm">
              <Users className="w-4 h-4 text-gold animate-glow-pulse" />
              <span className="text-muted-foreground">Recent payout:</span>
              <span className="text-gold font-semibold">User***775 withdrew €5,600</span>
              <span className="text-muted-foreground">• 2 minutes ago</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
