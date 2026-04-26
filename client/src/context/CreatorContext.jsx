import { createContext, useContext, useState } from 'react';

const CreatorContext = createContext(null);

export function CreatorProvider({ children }) {
  const [creator, setCreator] = useState(() => {
    try {
      const saved = localStorage.getItem('creator');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (token, creatorData) => {
    localStorage.setItem('creatorToken', token);
    localStorage.setItem('creator', JSON.stringify(creatorData));
    setCreator(creatorData);
  };

  const logout = () => {
    localStorage.removeItem('creatorToken');
    localStorage.removeItem('creator');
    setCreator(null);
  };

  return (
    <CreatorContext.Provider value={{ creator, login, logout }}>
      {children}
    </CreatorContext.Provider>
  );
}

export const useCreator = () => useContext(CreatorContext);
