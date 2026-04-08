import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../store/authSlice';
import { LogOut, Settings, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate('/login');
  };

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
          >
            <Wallet size={20} />
          </motion.div>
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}
          >
            SplitWise<span style={{ color: 'hsl(var(--p))' }}>Lite</span>
          </motion.span>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        {/* Profile Link */}
        <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.4rem 0.9rem 0.4rem 0.4rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
          >
            {/* Avatar */}
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid hsl(var(--p))', boxShadow: '0 0 0 2px hsla(var(--p), 0.2)' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white', fontSize: '0.7rem' }}>
                  {initials}
                </div>
              )}
            </div>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{user?.name}</span>
            <Settings size={14} style={{ color: 'hsl(var(--muted-h))' }} />
          </motion.div>
        </Link>

        {/* Logout */}
        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: 'hsla(var(--error), 0.15)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout} 
          className="btn" 
          style={{ 
            background: 'hsla(var(--glass-border), 0.1)', 
            color: 'hsl(var(--error))', 
            width: 'auto', 
            padding: '0.5rem 1rem',
            border: '1px solid hsla(var(--error), 0.2)'
          }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: '700' }}>Logout</span>
        </motion.button>
      </div>
    </nav>
  );
}

export default Navbar;
