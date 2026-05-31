import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, Globe } from "lucide-react";
import logo from "@/assets/logo.png";

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3">
            <img src={logo} alt="Universal Stock Trade" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-gold transition-colors">
              Home
            </Link>
            <Link to="/challenge" className="text-foreground hover:text-gold transition-colors">
              Challenges
            </Link>
            <Link to="/dashboard" className="text-foreground hover:text-gold transition-colors">
              Dashboard
            </Link>
            <Link to="/about" className="text-foreground hover:text-gold transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-foreground hover:text-gold transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Buttons & Translate Widget */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm">
              <Globe className="w-4 h-4 text-gold" />
              <div id="google_translate_element" className="translate-widget"></div>
            </div>
            <Link to="/auth">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">Get Funded</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-foreground hover:text-gold transition-colors">
                Home
              </Link>
              <Link to="/challenge" className="text-foreground hover:text-gold transition-colors">
                Challenges
              </Link>
              <Link to="/dashboard" className="text-foreground hover:text-gold transition-colors">
                Dashboard
              </Link>
              <Link to="/about" className="text-foreground hover:text-gold transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-foreground hover:text-gold transition-colors">
                Contact
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm mb-2">
                  <Globe className="w-4 h-4 text-gold" />
                  <div id="google_translate_element_mobile" className="translate-widget"></div>
                </div>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero" className="w-full">
                    Get Funded
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
