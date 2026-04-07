import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGroups, createGroup, updateGroup, deleteGroup, reset } from '../store/groupSlice';
import { Plus, Users, ArrowRight, Edit2, Trash2 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { groups, isLoading, isError, message } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);
  
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (isError) {
      alert(message);
    }
    dispatch(getGroups());
    return () => {
      dispatch(reset());
    };
  }, [isError, message, dispatch]);

  const onAddGroup = (e) => {
    e.preventDefault();
    if (!groupName) return;
    dispatch(createGroup({ name: groupName, members: [] }));
    setGroupName('');
    setShowModal(false);
  };

  const onUpdateGroup = (e) => {
    e.preventDefault();
    if (!groupName || !editGroup) return;
    dispatch(updateGroup({ groupId: editGroup._id, groupData: { name: groupName } }));
    setGroupName('');
    setEditGroup(null);
  };

  const onDeleteGroup = (e, groupId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this group? All associated expenses will be permanently removed.')) {
      dispatch(deleteGroup(groupId));
    }
  };

  const openEditModal = (e, group) => {
    e.stopPropagation();
    setEditGroup(group);
    setGroupName(group.name);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="auth-title">Your Groups</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          <span>New Group</span>
        </button>
      </header>

      {isLoading ? (
        <p className="label">Loading groups...</p>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="group-grid"
        >
          {groups.length > 0 ? (
            groups.map((group) => (
              <motion.div 
                variants={itemVariants}
                layout
                key={group._id} 
                className="glass-card group-card" 
                onClick={() => navigate(`/group/${group._id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{group.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={16} className="label" />
                      <span className="label">{group.members.length} members</span>
                    </div>
                    {user && group.createdBy === user._id && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                            <button onClick={(e) => openEditModal(e, group)} className="btn" style={{ padding: '0.4rem', width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--muted-h)' }}>
                                <Edit2 size={14} />
                            </button>
                            <button onClick={(e) => onDeleteGroup(e, group._id)} className="btn" style={{ padding: '0.4rem', width: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(var(--error))' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                  </div>
                  <ArrowRight size={20} style={{ marginTop: '4px', color: 'hsl(var(--p))' }} />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <p className="label">No groups found. Create one to get started!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-card auth-card">
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Group</h2>
            <form onSubmit={onAddGroup}>
              <div className="form-group">
                <label className="label">Group Name</label>
                <input
                  type="text"
                  className="input"
                  value={groupName}
                  placeholder="e.g. Goa Trip"
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editGroup && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-card auth-card">
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Edit Group</h2>
            <form onSubmit={onUpdateGroup}>
              <div className="form-group">
                <label className="label">Group Name</label>
                <input
                  type="text"
                  className="input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setEditGroup(null)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
