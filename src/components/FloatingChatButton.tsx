import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const WHATSAPP_NUMBER = '447587620916';
const WHATSAPP_MESSAGE = 'Hello, I have a question about Universal Stock Trade.';

interface Position {
  x: number;
  y: number;
}

export const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: window.innerWidth - 90, y: window.innerHeight - 90 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const savedPosition = localStorage.getItem('chatButtonPosition');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          setPosition(pos);
        }
      } catch (e) {
        console.error('Failed to load position', e);
      }
    }
  }, []);

  const savePosition = (newPosition: Position) => {
    localStorage.setItem('chatButtonPosition', JSON.stringify(newPosition));
    setPosition(newPosition);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - buttonRect.left,
      y: e.clientY - buttonRect.top,
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    newX = Math.max(10, Math.min(window.innerWidth - 70, newX));
    newY = Math.max(60, Math.min(window.innerHeight - 100, newY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const openJivoChat = () => {
    // Try to find and click the JivoChat button
    const jivoButton = document.querySelector('.jivo-button') as HTMLElement;
    if (jivoButton) {
      jivoButton.click();
    } else {
      // Alternative: look for any JivoChat element
      const jivoWidget = document.querySelector('#jivo-container iframe') as HTMLElement;
      if (jivoWidget) {
        // Iframe exists but we can't click it directly
        console.log('JivoChat widget found');
      }
    }
    setIsOpen(false);
  };

  const buttonStyle = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 9999,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div style={buttonStyle}>
      {isOpen && (
        <Card className="absolute bottom-16 right-0 mb-2 w-64 p-3 shadow-xl bg-[#1a0b2e] border border-[#DA123E33] animate-in fade-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-white">Chat with us</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              onClick={openWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.645 2.136.996 3.46.996 3.179 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.767-5.765-5.768zm3.236 8.308c-.162.433-.865.814-1.459.814-.275 0-.592-.058-1.022-.192-.977-.304-1.857-1.023-2.437-1.757-.145-.185-.324-.411-.459-.643-.454-.782-.595-1.588-.398-2.372.089-.355.273-.538.5-.666.199-.111.465-.143.702-.143.091 0 .182.005.271.016.114.014.229.033.343.068.151.047.221.184.278.331.062.16.125.409.178.627.04.161.058.338.022.5-.039.171-.116.295-.211.42-.107.14-.144.177-.206.262-.112.15-.086.248.053.425.723.915 1.494 1.373 2.375 1.738.166.069.289.109.415.129.12.019.231-.016.327-.094.108-.088.193-.207.256-.336.085-.173.129-.293.186-.467.086-.26.137-.346.209-.461.077-.124.172-.199.312-.259.14-.061.281-.074.422-.031.327.099.675.274.929.486.148.124.259.269.325.44.199.514.199 1.141-.018 1.618z"/>
              </svg>
              WhatsApp Chat
            </Button>
            <Button
              onClick={openJivoChat}
              variant="outline"
              className="w-full border-[#DA123E33] text-white hover:bg-[#DA123E33]"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Live Chat
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Click to start a conversation
          </p>
        </Card>
      )}

      <button
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        onMouseDown={handleMouseDown}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-[#DA123E] to-[#ff2b4f] shadow-lg hover:shadow-glow transition-all duration-300 flex items-center justify-center group"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#1a0b2e] text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-[#DA123E33] pointer-events-none">
          Need help? Chat with us!
        </span>
        
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Drag to move
        </div>
      </button>
    </div>
  );
};