import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1.5rem' }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card" 
            style={{ maxWidth: '450px', width: '100%', padding: '2rem', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: isDestructive ? 'hsla(var(--error), 0.1)' : 'hsla(var(--p), 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                color: isDestructive ? 'hsl(var(--error))' : 'hsl(var(--p))'
              }}>
                <AlertTriangle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>{title}</h3>
                <p className="label" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{message}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-h))', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={onClose} 
                className="btn" 
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
              >
                {cancelText}
              </button>
              <button 
                onClick={() => { onConfirm(); onClose(); }} 
                className="btn" 
                style={{ 
                    flex: 1, 
                    background: isDestructive ? 'hsl(var(--error))' : 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))',
                    color: 'white',
                    boxShadow: isDestructive ? '0 8px 20px -6px hsla(var(--error), 0.4)' : '0 8px 20px -6px hsla(var(--p), 0.4)' 
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
