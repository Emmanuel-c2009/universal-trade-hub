// src/lib/storageHelpers.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Get public URL for a storage file
 * Handles all URL formats and fixes 404 errors
 */
export const getPublicUrl = (path: string | null | undefined): string => {
  if (!path) {
    console.warn('No path provided to getPublicUrl');
    return '';
  }
  
  // If it's already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it starts with /, it's a relative URL
  if (path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  
  // Check if it's a Supabase storage path
  if (path.includes('p2p_proofs/') || path.includes('deposit-proofs/') || path.includes('payment-proofs/')) {
    try {
      const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting public URL from Supabase:', error);
      return '';
    }
  }
  
  // Default: try to get from payment-proofs bucket
  try {
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
};

/**
 * Open payment proof in a new tab
 * Returns the URL or null if failed
 */
export const viewPaymentProof = (url: string | null | undefined): string | null => {
  if (!url) {
    console.error('No payment proof URL provided');
    return null;
  }
  
  const fullUrl = getPublicUrl(url);
  
  if (!fullUrl) {
    console.error('Could not generate valid URL for payment proof');
    return null;
  }
  
  // Open in new tab
  window.open(fullUrl, '_blank');
  return fullUrl;
};

/**
 * Check if a payment proof URL is valid
 */
export const isValidPaymentProof = async (url: string): Promise<boolean> => {
  const fullUrl = getPublicUrl(url);
  if (!fullUrl) return false;
  
  try {
    const response = await fetch(fullUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};