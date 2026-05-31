// src/lib/blockchainFee.ts

import { supabase } from "@/integrations/supabase/client";

export interface FeeConfig {
  fee_enabled: boolean;
  crypto_fee_percent: number;
  bank_fee_percent: number;
  card_fee_percent: number;
  cash_mailing_fee_percent: number;
  minimum_withdrawal: number;
}

export interface GatewayAddress {
  id: string;
  crypto_symbol: string;
  crypto_name: string;
  network: string;
  wallet_address: string;
  qr_code_url: string | null;
  is_active: boolean;
}

export async function getFeeConfig(): Promise<FeeConfig | null> {
  const { data, error } = await supabase
    .from("withdrawal_fee_config")
    .select("*")
    .is("user_id", null)
    .single();

  if (error || !data) {
    // Return default values if no config exists
    return {
      fee_enabled: true,
      crypto_fee_percent: 10,
      bank_fee_percent: 8,
      card_fee_percent: 8,
      cash_mailing_fee_percent: 15,
      minimum_withdrawal: 10000,
    };
  }

  return {
    fee_enabled: data.fee_enabled,
    crypto_fee_percent: data.crypto_fee_percent || 10,
    bank_fee_percent: data.bank_fee_percent || 8,
    card_fee_percent: data.card_fee_percent || 8,
    cash_mailing_fee_percent: (data as any).cash_mailing_fee_percent || 15,
    minimum_withdrawal: data.minimum_withdrawal || 10000,
  };
}

export async function getGatewayAddresses(): Promise<GatewayAddress[]> {
  const { data, error } = await supabase
    .from("blockchain_addresses")
    .select("*")
    .eq("address_type", "gateway")
    .eq("is_active", true);

  if (error) return [];
  return data as GatewayAddress[];
}

export function calculateFee(amount: number, feePercent: number): number {
  return (amount * feePercent) / 100;
}

export function getFeePercentForMethod(method: string, config: FeeConfig): number {
  switch (method) {
    case "crypto":
      return config.crypto_fee_percent;
    case "bank":
      return config.bank_fee_percent;
    case "card":
      return config.card_fee_percent;
    case "cash_mailing":
      return config.cash_mailing_fee_percent;
    default:
      return config.crypto_fee_percent;
  }
}