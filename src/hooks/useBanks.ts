// src/hooks/useBanks.ts - SUPABASE VERSION
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bank {
  id: string;
  name: string;
  country: string;
  networkPercentage: number;
  remark: 'successful' | 'average' | 'poor';
  swiftCode?: string;
  createdAt: string;
  updatedAt: string;
}

export const useBanks = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  // Load banks from Supabase
  const loadBanks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const formattedBanks: Bank[] = (data || []).map(bank => ({
        id: bank.id,
        name: bank.name,
        country: bank.country,
        networkPercentage: bank.network_percentage,
        remark: bank.remark as 'successful' | 'average' | 'poor',
        swiftCode: bank.swift_code,
        createdAt: bank.created_at,
        updatedAt: bank.updated_at,
      }));
      
      setBanks(formattedBanks);
    } catch (error) {
      console.error('Error loading banks:', error);
      toast.error('Failed to load banks');
    } finally {
      setLoading(false);
    }
  };

  // Add a single bank
  const addBank = async (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .insert({
          name: bank.name,
          country: bank.country,
          network_percentage: bank.networkPercentage,
          remark: bank.remark,
          swift_code: bank.swiftCode || '',
        })
        .select()
        .single();

      if (error) throw error;
      
      const newBank: Bank = {
        id: data.id,
        name: data.name,
        country: data.country,
        networkPercentage: data.network_percentage,
        remark: data.remark,
        swiftCode: data.swift_code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      setBanks(prev => [...prev, newBank]);
      return newBank;
    } catch (error) {
      console.error('Error adding bank:', error);
      toast.error('Failed to add bank');
      throw error;
    }
  };

  // Update a bank
  const updateBank = async (id: string, updates: Partial<Bank>) => {
    try {
      const supabaseUpdates: any = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.country !== undefined) supabaseUpdates.country = updates.country;
      if (updates.networkPercentage !== undefined) supabaseUpdates.network_percentage = updates.networkPercentage;
      if (updates.remark !== undefined) supabaseUpdates.remark = updates.remark;
      if (updates.swiftCode !== undefined) supabaseUpdates.swift_code = updates.swiftCode;
      
      const { error } = await supabase
        .from('banks')
        .update(supabaseUpdates)
        .eq('id', id);

      if (error) throw error;
      
      setBanks(prev => prev.map(bank => 
        bank.id === id ? { ...bank, ...updates, updatedAt: new Date().toISOString() } : bank
      ));
    } catch (error) {
      console.error('Error updating bank:', error);
      toast.error('Failed to update bank');
      throw error;
    }
  };

  // Delete a single bank
  const deleteBank = async (id: string) => {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBanks(prev => prev.filter(bank => bank.id !== id));
    } catch (error) {
      console.error('Error deleting bank:', error);
      toast.error('Failed to delete bank');
      throw error;
    }
  };

  // Delete multiple banks
  const deleteMultipleBanks = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      setBanks(prev => prev.filter(bank => !ids.includes(bank.id)));
    } catch (error) {
      console.error('Error deleting banks:', error);
      toast.error('Failed to delete banks');
      throw error;
    }
  };

  // Clear all banks
  const clearAllBanks = async () => {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) throw error;
      
      setBanks([]);
    } catch (error) {
      console.error('Error clearing banks:', error);
      toast.error('Failed to clear banks');
      throw error;
    }
  };

  // Upload banks via CSV
  const uploadBanksCSV = async (csvData: Array<{ name: string; country: string; swiftCode?: string }>) => {
    try {
      const banksToInsert = csvData.map(row => {
        const randomPercentage = Math.floor(Math.random() * (94 - 54 + 1)) + 54;
        const remarks: ('successful' | 'average' | 'poor')[] = ['successful', 'average', 'average', 'successful', 'successful', 'average'];
        const randomRemark = remarks[Math.floor(Math.random() * remarks.length)];
        
        return {
          name: row.name.trim(),
          country: row.country.trim().toUpperCase(),
          network_percentage: randomPercentage,
          remark: randomRemark === 'poor' ? 'average' : randomRemark,
          swift_code: row.swiftCode || '',
        };
      });
      
      const { data, error } = await supabase
        .from('banks')
        .insert(banksToInsert)
        .select();

      if (error) throw error;
      
      const newBanks: Bank[] = (data || []).map(bank => ({
        id: bank.id,
        name: bank.name,
        country: bank.country,
        networkPercentage: bank.network_percentage,
        remark: bank.remark,
        swiftCode: bank.swift_code,
        createdAt: bank.created_at,
        updatedAt: bank.updated_at,
      }));
      
      setBanks(prev => [...prev, ...newBanks]);
      return newBanks;
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to upload CSV');
      throw error;
    }
  };

  // Get banks by country
  const getBanksByCountry = (countryCode: string) => {
    return banks.filter(bank => bank.country === countryCode);
  };

  // Search banks
  const searchBanks = (query: string, countryCode?: string) => {
    let filtered = banks;
    if (countryCode) {
      filtered = filtered.filter(bank => bank.country === countryCode);
    }
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(bank => 
        bank.name.toLowerCase().includes(lowerQuery)
      );
    }
    return filtered;
  };

  // Get bank statistics
  const getBankStats = () => {
    const totalBanks = banks.length;
    const countries = [...new Set(banks.map(b => b.country))];
    const avgNetworkPercentage = banks.reduce((sum, b) => sum + b.networkPercentage, 0) / totalBanks || 0;
    const successfulBanks = banks.filter(b => b.remark === 'successful').length;
    
    return {
      totalBanks,
      countriesCount: countries.length,
      avgNetworkPercentage: Math.round(avgNetworkPercentage),
      successfulBanks,
      averageBanks: banks.filter(b => b.remark === 'average').length,
    };
  };

  // Load banks on mount
  useEffect(() => {
    loadBanks();
  }, []);

  return {
    banks,
    loading,
    addBank,
    updateBank,
    deleteBank,
    deleteMultipleBanks,
    clearAllBanks,
    uploadBanksCSV,
    getBanksByCountry,
    searchBanks,
    getBankStats,
    refreshBanks: loadBanks,
  };
};