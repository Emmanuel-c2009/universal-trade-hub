import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import arnasImg from "@/assets/testimonials/arnas.png";
import greckoImg from "@/assets/testimonials/grecko.png";
import vipulImg from "@/assets/testimonials/vipul.png";
import hopeImg from "@/assets/testimonials/hope.png";

const testimonials = [
  {
    name: "Arnas",
    country: "Lithuania",
    flag: "🇱🇹",
    payout: "€40,000",
    fundedIn: "12 days",
    tradingStyle: "Scalping",
    image: arnasImg,
    video: "/videos/testimonial-1.mp4",
  },
  {
    name: "Grecko",
    country: "Germany",
    flag: "🇩🇪",
    payout: "€14,000",
    fundedIn: "8 days",
    tradingStyle: "Day Trading",
    image: greckoImg,
    video: "/videos/testimonial-2.mp4",
  },
  {
    name: "Vipul",
    country: "India",
    flag: "🇮🇳",
    payout: "€11,500",
    fundedIn: "15 days",
    tradingStyle: "Swing Trading",
    image: vipulImg,
    video: "/videos/testimonial-3.mp4",
  },
  {
    name: "Hope",
    country: "USA",
    flag: "🇺🇸",
    payout: "€29,000",
    fundedIn: "10 days",
    tradingStyle: "Position Trading",
    image: hopeImg,
    video: "/videos/testimonial-4.mp4",
  },
];

export const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const next = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  return (
    <section id="testimonials" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Success <span className="text-gold">Stories</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Real traders. Real results. Real payouts.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden bg-card border-border">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Image/Video Side */}
                    <div className="relative h-96 md:h-auto bg-primary/20">
                      <img
                        src={current.image}
                        alt={current.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute bottom-6 left-6 z-10">
                        <div className="text-4xl font-bold text-foreground mb-2">
                          {current.name}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-2xl">{current.flag}</span>
                          <span className="text-lg">{current.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info Side */}
                    <div className="p-8 flex flex-col justify-center">
                      <div className="mb-6">
                        <div className="text-gold text-6xl font-bold mb-2">
                          {current.payout}
                        </div>
                        <div className="text-muted-foreground text-lg">First Payout</div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-lg">
                          <span className="text-muted-foreground">Funded In:</span>
                          <span className="font-bold text-secondary">{current.fundedIn}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-lg">
                          <span className="text-muted-foreground">Trading Style:</span>
                          <span className="font-bold">{current.tradingStyle}</span>
                        </div>
                      </div>

                      <a
                        href={current.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-glow text-accent-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--gold)/0.4)]"
                      >
                        <Play className="w-5 h-5" />
                        Watch Video Testimonial
                      </a>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background p-3 rounded-full border border-border transition-all duration-300 hover:scale-110 z-10"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background p-3 rounded-full border border-border transition-all duration-300 hover:scale-110 z-10"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-gold w-8"
                    : "bg-border hover:bg-muted-foreground"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
