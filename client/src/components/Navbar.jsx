import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  citizen: { en: 'Citizen', kn: 'ನಾಗರಿಕ', color: 'bg-teal-600' },
  officer: { en: 'Officer', kn: 'ಅಧಿಕಾರಿ', color: 'bg-blue-600' },
  admin: { en: 'Admin', kn: 'ನಿರ್ವಾಹಕ', color: 'bg-purple-600' },
  auditor: { en: 'Auditor', kn: 'ಲೆಕ್ಕ ಪರಿಶೋಧಕ', color: 'bg-red-600' },
};

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logoutUser(); navigate('/'); };

  const navLinks = () => {
    if (!user) return [
      { to: '/', label: 'ಮನೆ / Home' },
      { to: '/public', label: 'ಪಾರದರ್ಶಕತೆ / Transparency' },
      { to: '/tenders', label: 'ಟೆಂಡರ್ / Tenders' },
    ];
    if (user.role === 'citizen') return [
      { to: '/dashboard', label: 'ನನ್ನ ಅರ್ಜಿಗಳು / My Files' },
      { to: '/submit', label: '+ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ / Submit' },
      { to: '/public', label: 'ಪಾರದರ್ಶಕತೆ / Transparency' },
      { to: '/tenders', label: 'ಟೆಂಡರ್ / Tenders' },
    ];
    if (user.role === 'officer') return [
      { to: '/dashboard', label: 'ಕಾರ್ಯಕ್ಕಾಗಿ / Pending' },
      { to: '/beneficiaries', label: 'ಫಲಾನುಭವಿ / Beneficiaries' },
      { to: '/finance', label: 'ಹಣಕಾಸು / Finance' },
      { to: '/ledger', label: 'ಲೆಜರ್ / Ledger' },
    ];
    if (user.role === 'admin') return [
      { to: '/dashboard', label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ / Dashboard' },
      { to: '/beneficiaries', label: 'ಫಲಾನುಭವಿ / Beneficiaries' },
      { to: '/tenders', label: 'ಟೆಂಡರ್ / Tenders' },
      { to: '/finance', label: 'ಹಣಕಾಸು / Finance' },
      { to: '/ledger', label: 'ಲೆಜರ್ / Ledger' },
    ];
    if (user.role === 'auditor') return [
      { to: '/dashboard', label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ / Dashboard' },
      { to: '/ledger', label: 'ಲೆಜರ್ / Ledger' },
      { to: '/public', label: 'ಪಾರದರ್ಶಕತೆ / Transparency' },
    ];
    return [];
  };

  const roleInfo = user ? ROLE_LABELS[user.role] : null;

  return (
    <nav className="bg-[#0D1B2A] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏛</span>
          <div>
            <div className="text-sm font-bold text-teal-400 leading-tight kn">ಪ್ರಜಾಕೀಯ</div>
            <div className="text-xs text-gray-400 leading-tight">Prajakeeya</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks().map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors kn
                ${location.pathname === l.to ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleInfo?.color}`}>
                  {roleInfo?.kn} / {roleInfo?.en}
                </span>
                <span className="text-xs text-gray-400">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded font-medium"
              >
                ಹೊರಗೆ / Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="text-xs bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded font-medium">
                ಲಾಗಿನ್ / Login
              </Link>
              <Link to="/register" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded font-medium">
                ನೋಂದಣಿ / Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-1">
          {navLinks().map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded kn"
            >{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
