import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symbols } = await req.json();
    const symbolList = symbols || 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,XAU/USD,XAG/USD';

    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbolList}&apikey=${apiKey}`
    );
    const data = await response.json();

    // Also fetch quote data for change info
    const quoteResponse = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbolList}&apikey=${apiKey}`
    );
    const quoteData = await quoteResponse.json();

    // Normalize response - Twelve Data returns object for single symbol, object with symbol keys for multiple
    const prices: Record<string, { price: number; change: number; percent_change: number }> = {};

    if (symbolList.includes(',')) {
      // Multiple symbols
      for (const symbol of symbolList.split(',')) {
        const trimmed = symbol.trim();
        if (data[trimmed]?.price) {
          prices[trimmed] = {
            price: parseFloat(data[trimmed].price),
            change: quoteData[trimmed]?.change ? parseFloat(quoteData[trimmed].change) : 0,
            percent_change: quoteData[trimmed]?.percent_change ? parseFloat(quoteData[trimmed].percent_change) : 0,
          };
        }
      }
    } else {
      // Single symbol
      if (data.price) {
        prices[symbolList] = {
          price: parseFloat(data.price),
          change: quoteData?.change ? parseFloat(quoteData.change) : 0,
          percent_change: quoteData?.percent_change ? parseFloat(quoteData.percent_change) : 0,
        };
      }
    }

    return new Response(JSON.stringify({ prices, timestamp: Date.now() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
