import React, { createContext, useState, useContext, useCallback } from 'react';

interface UserBetContextType {
  userHasBet: boolean;
  setUserHasBet: (value: boolean) => void;
  resetUserHasBet: () => void;
}

const UserBetContext = createContext<UserBetContextType | undefined>(undefined);

export const UserBetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userHasBet, setUserHasBetState] = useState(false);

  const setUserHasBet = useCallback((value: boolean) => {
    
    setUserHasBetState(value);
  }, []);

  const resetUserHasBet = useCallback(() => {
    
    setUserHasBetState(false);
  }, []);

  return (
    <UserBetContext.Provider value={{ userHasBet, setUserHasBet, resetUserHasBet }}>
      {children}
    </UserBetContext.Provider>
  );
};

export const useUserBet = () => {
  const context = useContext(UserBetContext);
  if (context === undefined) {
    throw new Error('useUserBet must be used within a UserBetProvider');
  }
  return context;
};