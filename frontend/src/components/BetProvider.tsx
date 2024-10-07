import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

interface BetData {
 wallet: string;
 amount: string;
 color: string;
 inputValue: string;
}

export const BetContext = createContext<{ betData: BetData; setBetData: React.Dispatch<React.SetStateAction<BetData>> } | undefined>(undefined);

export const BetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [betData, setBetData] = useState<BetData>({
    wallet: '',
    amount: '',
    color: '',
    inputValue: '',
  });

  const value = useMemo(() => ({ betData, setBetData }), [betData, setBetData]);

  return (
    <BetContext.Provider value={value}>
    {children}
    </BetContext.Provider>
  );
};

export const useBet = () => {
  const context = useContext(BetContext);
  if (context === undefined) {
    throw new Error('useBet must be used within a BetProvider');
  }
  return context;
};