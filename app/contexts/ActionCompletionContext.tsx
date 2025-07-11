'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ActionCompletionContextType {
  isOpen: boolean;
  actionId: string | null;
  actionTitle: string | null;
  openModal: (actionId: string, actionTitle: string) => void;
  closeModal: () => void;
}

const ActionCompletionContext = createContext<ActionCompletionContextType | undefined>(undefined);

export function ActionCompletionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState<string | null>(null);

  const openModal = useCallback((actionId: string, actionTitle: string) => {
    setActionId(actionId);
    setActionTitle(actionTitle);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setActionId(null);
    setActionTitle(null);
  }, []);

  return (
    <ActionCompletionContext.Provider value={{ 
      isOpen, 
      actionId, 
      actionTitle, 
      openModal, 
      closeModal 
    }}>
      {children}
    </ActionCompletionContext.Provider>
  );
}

export function useActionCompletion() {
  const context = useContext(ActionCompletionContext);
  if (context === undefined) {
    throw new Error('useActionCompletion must be used within an ActionCompletionProvider');
  }
  return context;
}