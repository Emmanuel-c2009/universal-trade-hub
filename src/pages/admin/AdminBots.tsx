import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Bot,
  Star,
  TrendingUp,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BotEditModal } from "@/components/admin/BotEditModal";

interface AIBot {
  id: string;
  name: string;
  description: string | null;
  monthly_cost: number;
  star_rating: number;
  profit_range_min: number;
  profit_range_max: number;
  is_active: boolean;
  trading_pairs: string[];
  avatar_url: string | null;
  created_at: string;
}

export const AdminBots = () => {
  const [bots, setBots] = useState<AIBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<AIBot | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI bots",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleCreateBot = () => {
    setSelectedBot(null);
    setIsCreating(true);
    setEditModalOpen(true);
  };

  const handleEditBot = (bot: AIBot) => {
    setSelectedBot(bot);
    setIsCreating(false);
    setEditModalOpen(true);
  };

  const handleToggleActive = async (bot: AIBot) => {
    try {
      const { error } = await supabase
        .from('ai_bots')
        .update({ is_active: !bot.is_active })
        .eq('id', bot.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bot ${bot.is_active ? 'deactivated' : 'activated'} successfully`,
      });
      fetchBots();
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast({
        title: "Error",
        description: "Failed to update bot status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;

    try {
      const { error } = await supabase
        .from('ai_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bot deleted successfully",
      });
      fetchBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast({
        title: "Error",
        description: "Failed to delete bot",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Bot Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage AI trading bots
          </p>
        </div>
        <Button onClick={handleCreateBot} className="bg-gradient-to-r from-secondary to-gold">
          <Plus className="w-4 h-4 mr-2" />
          Create New Bot
        </Button>
      </div>

      {/* Bots Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-card animate-pulse rounded-xl" />
          ))
        ) : bots.length === 0 ? (
          <Card className="col-span-full bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No AI bots configured yet</p>
              <Button onClick={handleCreateBot} className="mt-4">
                Create Your First Bot
              </Button>
            </CardContent>
          </Card>
        ) : (
          bots.map((bot, index) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card border-border hover:border-secondary/30 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-gold flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bot.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-gold fill-gold" />
                        <span className="text-sm text-muted-foreground">
                          {bot.star_rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditBot(bot)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Bot
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(bot)}>
                        <Power className="w-4 h-4 mr-2" />
                        {bot.is_active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteBot(bot.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Bot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {bot.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge variant={bot.is_active ? "default" : "secondary"}>
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm font-medium text-gold">
                      €{bot.monthly_cost}/month
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-muted-foreground">
                      Profit Range: {bot.profit_range_min}% - {bot.profit_range_max}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {bot.trading_pairs?.slice(0, 3).map((pair) => (
                      <Badge key={pair} variant="outline" className="text-xs">
                        {pair}
                      </Badge>
                    ))}
                    {bot.trading_pairs && bot.trading_pairs.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{bot.trading_pairs.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit/Create Modal */}
      <BotEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedBot(null);
          setIsCreating(false);
        }}
        bot={selectedBot}
        isCreating={isCreating}
        onSave={fetchBots}
      />
    </div>
  );
};
