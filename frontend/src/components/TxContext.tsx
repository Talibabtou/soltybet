import React, { createContext, useState, useContext, ReactNode } from 'react';

interface TransactionContextType {
  transactionStatus: 'idle' | 'pending' | 'success' | 'failure';
  setTransactionStatus: (status: 'idle' | 'pending' | 'success' | 'failure') => void;
  errorMessage: string;
  setErrorMessage: (message: string) => void;
  pendingBetId: string | null;
  setPendingBetId: (id: string | null) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'failure'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingBetId, setPendingBetId] = useState<string | null>(null);

  return (
    <TransactionContext.Provider value={{
      transactionStatus,
      setTransactionStatus,
      errorMessage,
      setErrorMessage,
      pendingBetId,
      setPendingBetId
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
};