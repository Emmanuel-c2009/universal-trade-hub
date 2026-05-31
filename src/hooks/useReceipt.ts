// src/hooks/useReceipt.ts
import { useState } from 'react';
import { TransactionData } from '../components/UniversalReceipt';

export const useReceipt = () => {
  const [receiptData, setReceiptData] = useState<TransactionData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openReceipt = (data: TransactionData) => {
    setReceiptData(data);
    setIsOpen(true);
  };

  const closeReceipt = () => {
    setIsOpen(false);
    setReceiptData(null);
  };

  const printReceipt = () => {
    window.print();
  };

  const downloadReceipt = () => {
    // PDF download will be added later
    alert('PDF download coming soon!');
  };

  return {
    receiptData,
    isOpen,
    openReceipt,
    closeReceipt,
    printReceipt,
    downloadReceipt,
  };
};