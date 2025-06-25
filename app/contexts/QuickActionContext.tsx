'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface QuickActionContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

const QuickActionContext = createContext<QuickActionContextType | undefined>(undefined);

export function QuickActionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <QuickActionContext.Provider value={{ isOpen, openModal, closeModal, toggleModal }}>
      {children}
    </QuickActionContext.Provider>
  );
}

export function useQuickAction() {
  const context = useContext(QuickActionContext);
  if (context === undefined) {
    throw new Error('useQuickAction must be used within a QuickActionProvider');
  }
  return context;
}