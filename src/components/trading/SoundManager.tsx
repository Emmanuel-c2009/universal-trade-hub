// src/components/trading/SoundManager.tsx

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Volume2, VolumeX } from "lucide-react";

interface SoundSettings {
  enabled: boolean;
  volume: number;
  sounds: {
    tradeWin: boolean;
    tradeLoss: boolean;
    stopLoss: boolean;
    takeProfit: boolean;
    tradeOpen: boolean; // Added tradeOpen sound
  };
}

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 50,
  sounds: {
    tradeWin: true,
    tradeLoss: true,
    stopLoss: true,
    takeProfit: true,
    tradeOpen: true, // Added default
  }
};

interface SoundContextType {
  settings: SoundSettings;
  updateSettings: (settings: Partial<SoundSettings>) => void;
  playSound: (type: keyof SoundSettings["sounds"]) => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export const useSounds = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSounds must be used within SoundProvider");
  }
  return context;
};

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    const saved = localStorage.getItem("soundSettings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("soundSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<SoundSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const playSound = useCallback((type: keyof SoundSettings["sounds"]) => {
    if (!settings.enabled || !settings.sounds[type]) return;

    // Create audio context for simple beep sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different events
    const frequencies: Record<string, number> = {
      tradeWin: 880,
      tradeLoss: 440,
      stopLoss: 330,
      takeProfit: 660,
      tradeOpen: 523.25 // C5 note - pleasant open sound
    };

    // Different wave types for different events
    const waveTypes: Record<string, OscillatorType> = {
      tradeWin: "sine",
      tradeLoss: "square",
      stopLoss: "sawtooth",
      takeProfit: "sine",
      tradeOpen: "triangle" // Triangle wave for smoother open sound
    };

    oscillator.frequency.value = frequencies[type] || 440;
    oscillator.type = waveTypes[type] || "sine";
    gainNode.gain.value = settings.volume / 100;

    oscillator.start();
    
    // Longer duration for tradeOpen (0.3 seconds instead of 0.2)
    const duration = type === "tradeOpen" ? 0.3 : 0.2;
    oscillator.stop(audioContext.currentTime + duration);
  }, [settings]);

  return (
    <SoundContext.Provider value={{ settings, updateSettings, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const SoundSettings = () => {
  const { settings, updateSettings } = useSounds();

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sound Settings</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateSettings({ enabled: !settings.enabled })}
        >
          {settings.enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Volume: {settings.volume}%</Label>
          <Slider
            value={[settings.volume]}
            onValueChange={([v]) => updateSettings({ volume: v })}
            max={100}
            step={1}
            disabled={!settings.enabled}
          />
        </div>

        <div className="space-y-3">
          {Object.entries(settings.sounds).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </Label>
              <Switch
                checked={value}
                onCheckedChange={(checked) =>
                  updateSettings({
                    sounds: { ...settings.sounds, [key]: checked }
                  })
                }
                disabled={!settings.enabled}
              />
            </div>
          ))}
        </div>

        {/* Preview buttons */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Preview Sounds:</p>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(settings.sounds).map((type) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                onClick={() => {
                  const context = useContext(SoundContext);
                  context?.playSound(type as keyof SoundSettings["sounds"]);
                }}
                disabled={!settings.enabled || !settings.sounds[type as keyof SoundSettings["sounds"]]}
                className="text-xs"
              >
                {type.replace(/([A-Z])/g, " $1").trim()}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};