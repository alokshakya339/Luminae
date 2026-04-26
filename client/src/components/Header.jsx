import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { guest, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__brand">
          <span>♡</span> Memories
        </div>
        {guest && (
          <div className="header__user">
            <span>Welcome, <strong>{guest.name}</strong></span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}
