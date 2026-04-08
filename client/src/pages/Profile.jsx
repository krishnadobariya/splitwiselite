import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { updateProfile, reset } from '../store/authSlice';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ArrowLeft, Camera, Save, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';

function Profile() {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);

  // --- Avatar State ---
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarChanged, setAvatarChanged] = useState(false);
  const fileInputRef = useRef(null);

  // --- Profile Form State ---
  const [name, setName] = useState(user?.name || '');
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'password'

  // --- Password Form State ---
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // --- Avatar upload handler ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
      setAvatarChanged(true);
    };
    reader.readAsDataURL(file);
  };

  // --- Save profile info ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    try {
      await dispatch(updateProfile({ name, ...(avatarChanged ? { avatar } : {}) })).unwrap();
      toast.success('Profile updated successfully!');
      setAvatarChanged(false);
    } catch (err) {
      toast.error(err);
    }
  };

  // --- Change password ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) { toast.error('New passwords do not match'); return; }
    try {
      await dispatch(updateProfile({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })).unwrap();
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err);
    }
  };

  // --- Generate initials avatar ---
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const passwordStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: '', color: 'transparent' },
      { label: 'Weak', color: 'hsl(var(--error))' },
      { label: 'Fair', color: 'hsl(30, 90%, 55%)' },
      { label: 'Good', color: 'hsl(50, 90%, 50%)' },
      { label: 'Strong', color: 'hsl(var(--success))' },
      { label: 'Very Strong', color: 'hsl(var(--success))' },
    ];
    return { score, ...levels[Math.min(score, 5)] };
  };

  const strength = passwordStrength(pwForm.newPassword);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <Link to="/" className="btn" style={{ padding: '0.6rem', width: 'auto', background: 'hsla(var(--glass-border), 0.1)', color: 'white', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.1rem' }}>My Profile</h1>
            <p className="label" style={{ fontSize: '0.85rem' }}>Manage your account settings</p>
          </div>
        </div>
      </motion.div>

      {/* Avatar + Name Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <motion.div whileHover={{ scale: 1.03 }} style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', border: '3px solid hsl(var(--p))', boxShadow: '0 0 0 6px hsla(var(--p), 0.15)', cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '800', color: 'white' }}>
                  {initials}
                </div>
              )}
            </motion.div>
            <button onClick={() => fileInputRef.current.click()} style={{ position: 'absolute', bottom: 0, right: 0, background: 'hsl(var(--p))', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', color: 'white' }}>
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.25rem' }}>{user?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--muted-h))' }}>
              <Mail size={14} />
              <span style={{ fontSize: '0.875rem' }}>{user?.email}</span>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-pill muted" style={{ fontSize: '0.7rem' }}>Member</span>
              {avatarChanged && <span className="status-pill success" style={{ fontSize: '0.7rem' }}>New photo ready</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem', borderRadius: '0.85rem', border: '1px solid var(--glass-border)' }}>
        {[
          { key: 'profile', label: 'Edit Profile', icon: <User size={15} /> },
          { key: 'password', label: 'Change Password', icon: <Shield size={15} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: 'all 0.25s', background: activeSection === tab.key ? 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))' : 'transparent', color: activeSection === tab.key ? 'white' : 'hsl(var(--muted-h))', boxShadow: activeSection === tab.key ? '0 4px 12px hsla(var(--p), 0.3)' : 'none' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Panels */}
      <AnimatePresence mode="wait">

        {activeSection === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              <User size={18} style={{ color: 'hsl(var(--p))' }} /> Profile Information
            </h3>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div className="form-group">
                <label className="label">Email Address</label>
                <input type="email" className="input" value={user?.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                <p className="label" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>Email cannot be changed</p>
              </div>
              <div className="form-group">
                <label className="label">Profile Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid hsl(var(--p))' }}>
                    {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, hsl(var(--p)), hsl(var(--s)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white', fontSize: '1rem' }}>{initials}</div>}
                  </div>
                  <button type="button" onClick={() => fileInputRef.current.click()} className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                    <Camera size={14} /> Upload Photo
                  </button>
                  {avatar && (
                    <button type="button" onClick={() => { setAvatar(''); setAvatarChanged(true); }} className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', background: 'hsla(var(--error), 0.1)', color: 'hsl(var(--error))', border: '1px solid hsla(var(--error), 0.2)', fontSize: '0.85rem' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: 'auto', padding: '0.65rem 2rem', display: 'flex', gap: '0.5rem' }}>
                <Save size={16} /> {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        )}

        {activeSection === 'password' && (
          <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              <Shield size={18} style={{ color: 'hsl(var(--p))' }} /> Change Password
            </h3>
            <form onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div className="form-group">
                <label className="label">Current Password</label>
                <div className="password-wrapper">
                  <input type={showCurrentPw ? 'text' : 'password'} className="input" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Enter current password" required style={{ paddingRight: '3rem' }} />
                  <button type="button" className="password-toggle" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                    {showCurrentPw ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label className="label">New Password</label>
                <div className="password-wrapper">
                  <input type={showNewPw ? 'text' : 'password'} className="input" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="At least 6 characters" required style={{ paddingRight: '3rem' }} />
                  <button type="button" className="password-toggle" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {/* Strength meter */}
                {pwForm.newPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ height: '4px', flex: 1, borderRadius: '2px', background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: '600' }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label className="label">Confirm New Password</label>
                <div className="password-wrapper">
                  <input type={showConfirmPw ? 'text' : 'password'} className="input" value={pwForm.confirmNewPassword} onChange={e => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })} placeholder="Repeat new password" required style={{ paddingRight: '3rem' }} />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                    {showConfirmPw ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {pwForm.confirmNewPassword && pwForm.newPassword === pwForm.confirmNewPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', color: 'hsl(var(--success))', fontSize: '0.8rem', fontWeight: '600' }}>
                    <CheckCircle size={14} /> Passwords match
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: 'auto', padding: '0.65rem 2rem', display: 'flex', gap: '0.5rem' }}>
                <Shield size={16} /> {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default Profile;
