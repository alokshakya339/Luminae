import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [guest, setGuest] = useState(() => {
    try {
      const saved = localStorage.getItem('guest');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (token, guestData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('guest', JSON.stringify(guestData));
    setGuest(guestData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guest');
    setGuest(null);
  };

  return (
    <AuthContext.Provider value={{ guest, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
