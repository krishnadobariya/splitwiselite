import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';
import Navbar from './components/Navbar';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const AnimatedPage = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

function AnimatedRoutes() {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={user ? <AnimatedPage><Dashboard /></AnimatedPage> : <Navigate to="/login" />} />
                <Route path="/login" element={!user ? <AnimatedPage><Login /></AnimatedPage> : <Navigate to="/" />} />
                <Route path="/register" element={!user ? <AnimatedPage><Register /></AnimatedPage> : <Navigate to="/" />} />
                <Route path="/group/:id" element={user ? <AnimatedPage><GroupDetail /></AnimatedPage> : <Navigate to="/login" />} />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <Router>
      <div className="app-container">
        {user && <Navbar />}
        <main className="main-content">
            <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
}

export default App;
