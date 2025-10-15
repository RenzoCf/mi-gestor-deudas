import React, { createContext } from 'react';

export const DebtContext = createContext();

export const DebtProvider = ({ children }) => {
  // La lógica para manejar las deudas se encuentra en App.jsx por ahora.
  const value = {};
  return (
    <DebtContext.Provider value={value}>
      {children}
    </DebtContext.Provider>
  );
};
