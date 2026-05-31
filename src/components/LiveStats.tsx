import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Users, Euro, Clock, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
  decimals?: number;
}

const AnimatedCounter = ({ 
  value, 
  duration = 2, 
  decimals = 0,
  prefix = "",
  suffix = ""
}: { 
  value: number; 
  duration?: number; 
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return prefix + latest.toFixed(decimals).toLocaleString() + suffix;
  });
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, value, { duration });
    return controls.stop;
  }, [count, value, duration]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = latest;
      }
    });
    return () => unsubscribe();
  }, [rounded]);

  return <span ref={nodeRef} />;
};

const StatCard = ({ icon: Icon, value, suffix = "", prefix = "", label, duration = 2, decimals = 0 }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border hover:border-gold/50 transition-all duration-300 relative overflow-hidden group">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gold/20 rounded-lg p-3 w-fit">
              <Icon className="w-6 h-6 text-gold" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500 animate-pulse" />
          </div>
          
          <div className="mb-2">
            <motion.div 
              className="text-4xl font-bold bg-gradient-to-r from-foreground to-gold bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AnimatedCounter 
                value={value} 
                duration={duration}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
              />
            </motion.div>
          </div>
          
          <p className="text-muted-foreground font-medium">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
};

export const LiveStats = () => {
  const stats = [
    {
      icon: Users,
      value: 8547,
      label: "Funded Traders",
      duration: 2.5,
      decimals: 0,
      suffix: "+"
    },
    {
      icon: Euro,
      value: 24.8,
      label: "Total Payouts Distributed",
      duration: 2.5,
      decimals: 1,
      prefix: "€",
      suffix: "M"
    },
    {
      icon: Clock,
      value: 18,
      label: "Average Payout Time",
      duration: 2,
      decimals: 0,
      suffix: "h"
    },
    {
      icon: TrendingUp,
      value: 87.3,
      label: "Success Rate",
      duration: 2.5,
      decimals: 1,
      suffix: "%"
    }
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-full mb-4">
            <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            <span className="text-gold font-semibold uppercase tracking-wider text-sm">
              Live Statistics
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-gold to-gold-glow bg-clip-text text-transparent">
              Thousands of Traders
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join Europe&apos;s fastest-growing prop trading community
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Real-time Update Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Statistics updated in real-time</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
