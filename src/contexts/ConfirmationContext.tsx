import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmationState {
  isVisible: boolean;
  message: string;
  email: string;
}

interface ConfirmationContextType {
  confirmation: ConfirmationState;
  showConfirmation: (message: string, email: string) => void;
  hideConfirmation: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isVisible: false,
    message: '',
    email: ''
  });

  const showConfirmation = (message: string, email: string) => {
    setConfirmation({
      isVisible: true,
      message,
      email
    });
  };

  const hideConfirmation = () => {
    setConfirmation({
      isVisible: false,
      message: '',
      email: ''
    });
  };

  return (
    <ConfirmationContext.Provider value={{ confirmation, showConfirmation, hideConfirmation }}>
      {children}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}
