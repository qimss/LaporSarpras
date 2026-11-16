import { User } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: User | null;
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
  activeScreen?: string;
}

export function Header({ title, subtitle, user, onLogout, onNavigate, activeScreen }: HeaderProps) {
  return (
    <header className="app-header">
      {/* Left: Logo + Brand Text */}
      <div
        className="flex flex-row items-center gap-3 cursor-pointer flex-shrink-0"
        onClick={() => onNavigate && onNavigate(user?.role === 'admin' ? 'admin_dashboard' : 'report')}
      >
        <Logo />
        <div className="app-header__brand">
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
      </div>

      {/* Right: Nav Buttons */}
      <div className="flex flex-row items-center gap-2">
        {user ? (
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0c574a] text-[#CFE8E2] text-xs font-medium border border-[#1a7f6f]">
              👤 {user.nama_lengkap.split(' ')[0]} ({user.role.toUpperCase()})
            </span>

            {user.role === 'mahasiswa' && onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('report')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeScreen === 'report' ? 'bg-white text-[#0F6B5C] font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Lapor
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('my_reports')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeScreen === 'my_reports' ? 'bg-white text-[#0F6B5C] font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Laporan Saya
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('tracking')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeScreen === 'tracking' ? 'bg-white text-[#0F6B5C] font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Lacak Tiket
                </button>
              </>
            )}

            {user.role === 'admin' && onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('admin_dashboard')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeScreen === 'admin_dashboard' ? 'bg-white text-[#0F6B5C] font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
              </>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-colors ml-1"
              >
                Keluar
              </button>
            )}
          </>
        ) : (
          onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('tracking')}
                className="text-xs px-3 py-1.5 rounded-lg text-white/90 hover:text-white"
              >
                Lacak Tiket
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-[#0F6B5C] font-semibold shadow-sm"
              >
                Masuk
              </button>
            </>
          )
        )}
      </div>
    </header>
  );
}
