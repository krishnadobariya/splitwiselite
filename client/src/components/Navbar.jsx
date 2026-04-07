import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../store/authSlice';
import { LogOut, User as UserIcon, Wallet } from 'lucide-react';
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: 'hsla(var(--p), 0.15)', padding: '0.5rem', borderRadius: '50%', color: 'hsl(var(--p))', display: 'flex' }}>
            <UserIcon size={18} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{user?.name}</span>
        </div>
        
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
