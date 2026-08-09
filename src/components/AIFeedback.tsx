import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIFeedbackProps {
  messageId: string;
  sessionId: string;
  userId: string;
}

export const AIFeedback = ({ messageId, sessionId, userId }: AIFeedbackProps) => {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    if (rating === value) {
      // User clicked the same button again – remove feedback
      setRating(null);
      return;
    }

    setIsLoading(true);
    setRating(value);

    try {
      const { error } = await supabase
        .from('ai_feedback')
        .insert({
          message_id: messageId,
          session_id: sessionId,
          user_id: userId,
          rating: value,
        });

      if (error) throw error;

      toast.success(value === 'helpful' ? 'Thanks for your feedback! 👍' : 'We\'ll improve! 👎');
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback. Please try again.');
      setRating(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 p-0 rounded-full transition-all ${
          rating === 'helpful'
            ? 'text-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        onClick={() => handleFeedback('helpful')}
        disabled={isLoading}
        title="Helpful"
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 p-0 rounded-full transition-all ${
          rating === 'not_helpful'
            ? 'text-red-500 bg-red-500/20 hover:bg-red-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        onClick={() => handleFeedback('not_helpful')}
        disabled={isLoading}
        title="Not helpful"
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
    </div>
  );
};