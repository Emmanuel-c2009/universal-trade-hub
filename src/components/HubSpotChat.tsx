import { useEffect } from "react";

export const HubSpotChat = () => {
  useEffect(() => {
    // Check if script is already loaded
    if (document.getElementById('hs-script-loader')) {
      return;
    }

    // Create and load the HubSpot script
    const script = document.createElement('script');
    script.id = 'hs-script-loader';
    script.src = '//js-eu1.hs-scripts.com/147350981.js';
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';

    document.body.appendChild(script);

    return () => {
      // Cleanup is handled by HubSpot
    };
  }, []);

  return null;
};

export const openHubSpotChat = () => {
  const win = window as Window & { 
    HubSpotConversations?: { 
      widget: { 
        open: () => void;
        close: () => void;
      };
    };
  };
  
  if (win.HubSpotConversations?.widget) {
    win.HubSpotConversations.widget.open();
  } else {
    console.warn('HubSpot chat widget not loaded yet');
  }
};
