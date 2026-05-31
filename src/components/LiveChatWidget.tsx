import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openHubSpotChat } from "@/components/HubSpotChat";

export const LiveChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/+447587620916", "_blank");
    setIsOpen(false);
  };

  const handleWebsiteChatClick = () => {
    openHubSpotChat();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-64 p-4 shadow-xl animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Chat with us</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              onClick={handleWhatsAppClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Chat
            </Button>
            <Button
              onClick={handleWebsiteChatClick}
              variant="secondary"
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Website Chat
            </Button>
          </div>
        </Card>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-14 w-14 bg-gradient-to-r from-secondary to-gold hover:shadow-glow transition-all duration-300"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  );
};
