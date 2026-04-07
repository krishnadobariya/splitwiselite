import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupById, getGroupBalances, addMember, updateGroup, deleteGroup, removeMember, updateExpense, deleteExpense, reset } from '../store/groupSlice';
import axios from 'axios';
import { UserPlus, Plus, Users, Receipt, ArrowLeft, TrendingUp, TrendingDown, Edit2, Trash2, X } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

const sidebarVariants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, delay: 0.2 }
  }
};

function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentGroup, balances, isLoading } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  const [expenses, setExpenses] = useState([]);
  const [groupName, setGroupName] = useState('');
  
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    splitType: 'equal',
    customSplits: {}
  });

  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    dispatch(getGroupById(id));
    dispatch(getGroupBalances(id));
    fetchExpenses();
  }, [id, dispatch]);

  useEffect(() => {
    if (currentGroup) {
      setGroupName(currentGroup.name);
    }
  }, [currentGroup]);

  const fetchExpenses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`/api/expenses/${id}`, config);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const onAddExpense = async (e) => {
    e.preventDefault();
    const { description, amount, splitType, customSplits } = expenseData;

    let splits = [];
    if (splitType === 'equal') {
      const perPerson = amount / currentGroup.members.length;
      splits = currentGroup.members.map(m => ({ user: m._id, amount: perPerson }));
    } else {
        splits = Object.keys(customSplits).map(uid => ({ user: uid, amount: parseFloat(customSplits[uid]) }));
    }

    const payload = {
        description,
        amount: parseFloat(amount),
        payer: editingExpense ? editingExpense.payer._id : user._id,
        group: id,
        splitType,
        splits
    };

    try {
      if (editingExpense) {
        await dispatch(updateExpense({ expenseId: editingExpense._id, expenseData: payload })).unwrap();
      } else {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.post('/api/expenses', payload, config);
      }
      
      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseData({ description: '', amount: '', splitType: 'equal', customSplits: {} });
      dispatch(getGroupBalances(id));
      fetchExpenses();
    } catch (error) {
      alert(typeof error === 'string' ? error : error.response?.data?.message || 'Something went wrong');
    }
  };

  const onDeleteExpense = async (expenseId) => {
    if (window.confirm('Delete this expense?')) {
        try {
            await dispatch(deleteExpense(expenseId)).unwrap();
            fetchExpenses();
            dispatch(getGroupBalances(id));
        } catch (error) {
            alert(error);
        }
    }
  };

  const openEditExpense = (exp) => {
    setEditingExpense(exp);
    const customSplits = {};
    exp.splits.forEach(s => {
        customSplits[s.user._id] = s.amount;
    });
    setExpenseData({
        description: exp.description,
        amount: exp.amount,
        splitType: exp.splitType,
        customSplits
    });
    setShowExpenseModal(true);
  };

  const onAddMember = async (e) => {
    e.preventDefault();
    try {
      await dispatch(addMember({ groupId: id, email: memberEmail })).unwrap();
      setShowMemberModal(false);
      setMemberEmail('');
      dispatch(getGroupBalances(id));
    } catch (err) {
      alert(err || 'Member not found or already in group');
    }
  };

  const onRemoveMember = async (memberId) => {
    if (window.confirm('Remove this member from the group?')) {
        try {
            await dispatch(removeMember({ groupId: id, memberId })).unwrap();
            dispatch(getGroupBalances(id));
        } catch (error) {
            alert(error);
        }
    }
  };

  const onUpdateGroup = async (e) => {
    e.preventDefault();
    try {
        await dispatch(updateGroup({ groupId: id, groupData: { name: groupName } })).unwrap();
        setShowEditGroupModal(false);
    } catch (error) {
        alert(error);
    }
  };

  const onDeleteGroup = async () => {
    if (window.confirm('Delete this group and all its expenses?')) {
        try {
            await dispatch(deleteGroup(id)).unwrap();
            navigate('/');
        } catch (error) {
            alert(error);
        }
    }
  };

  if (isLoading || !currentGroup) return <p className="label">Loading group details...</p>;

  const isCreator = currentGroup.createdBy === user._id;

  // Calculate Max Balance for Bar Scaling
  const maxBalance = Math.max(...balances.map(b => Math.abs(b.balance)), 1);

  return (
    <div className="group-detail">
      {/* Integrated Header System */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '3rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Link to="/" className="btn" style={{ padding: '0.6rem', width: 'auto', background: 'hsla(var(--glass-border), 0.1)', color: 'white', borderRadius: '50%' }}>
                <ArrowLeft size={18} />
            </Link>
            <div style={{ flex: 1 }}>
                <h1 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{currentGroup.name}</h1>
                <p className="label" style={{ fontSize: '0.85rem' }}>Split with friends and track your balances</p>
            </div>
            {isCreator && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setShowEditGroupModal(true)} className="btn" style={{ padding: '0.6rem', width: 'auto', background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--muted-h))' }}>
                        <Edit2 size={16} />
                    </button>
                    <button onClick={onDeleteGroup} className="btn" style={{ padding: '0.6rem', width: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(var(--error))' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>

        <div className="dashboard-header" style={{ marginBottom: 0, paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'hsl(var(--muted-h))' }}>
                <Users size={20} />
                <span style={{ fontWeight: '600' }}>{currentGroup.members.length} Members</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowMemberModal(true)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserPlus size={18} />
                <span>Invite</span>
              </button>
              <button onClick={() => { setEditingExpense(null); setExpenseData({ description: '', amount: '', splitType: 'equal', customSplits: {} }); setShowExpenseModal(true); }} className="btn btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={18} />
                <span>Add Expense</span>
              </button>
            </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '2rem', marginTop: '1.5rem' }}>
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <Receipt size={22} style={{ color: 'hsl(var(--p))' }} />
              Recent Expenses
            </h2>
            <div className="expense-list">
              <AnimatePresence mode="popLayout">
              {expenses.length > 0 ? (
                expenses.map((exp) => (
                  <motion.div 
                    layout
                    variants={itemVariants}
                    key={exp._id} 
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--glass-border)', position: 'relative' }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600' }}>{exp.description}</p>
                      <p className="label" style={{ fontSize: '0.8rem' }}>Paid by {exp.payer?._id === user._id ? 'You' : exp.payer?.name}</p>
                      
                      {(exp.payer?._id === user._id || isCreator) && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => openEditExpense(exp)} style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-h))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                                <Edit2 size={12} /> Edit
                            </button>
                            <button onClick={() => onDeleteExpense(exp._id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--error)/0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>₹{exp.amount.toFixed(2)}</p>
                  </motion.div>
                ))
              ) : (
                <p className="label" style={{ textAlign: 'center' }}>No expenses yet.</p>
              )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.aside 
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <Users size={22} style={{ color: 'hsl(var(--p))' }} />
              Balances
            </h2>
            <div className="balance-list">
              {balances.map((bal) => {
                const isPositive = bal.balance >= 0;
                const isSettled = Math.abs(bal.balance) < 0.01;
                const percentage = (Math.abs(bal.balance) / maxBalance) * 100;
                
                return (
                  <motion.div key={bal.user._id} className="balance-item" layout>
                    <div className="member-avatar">
                        {bal.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}> {/* minWidth 0 allows ellipsis to work */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bal.user._id === user._id ? 'You' : bal.user.name}
                            </span>
                            <span className={`status-pill ${isSettled ? 'muted' : (isPositive ? 'success' : 'error')}`} style={{ whiteSpace: 'nowrap' }}>
                                {isSettled ? 'Settled' : (isPositive ? 'Owed' : 'Owes')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                            <span className="label" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                {bal.user.email}
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '1rem', color: isSettled ? 'hsl(var(--muted-h))' : (isPositive ? 'hsl(var(--success))' : 'hsl(var(--error))'), whiteSpace: 'nowrap' }}>
                                ₹{Math.abs(bal.balance).toFixed(2)}
                            </span>
                        </div>
                        {!isSettled && (
                            <div className="balance-bar-container">
                                <motion.div 
                                    className={`balance-fill ${isPositive ? 'success' : 'error'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                />
                            </div>
                        )}
                    </div>
                    {isCreator && bal.user._id !== user._id && (
                        <button 
                            onClick={() => onRemoveMember(bal.user._id)} 
                            style={{ background: 'hsla(var(--error), 0.1)', border: 'none', color: 'hsl(var(--error))', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', flexShrink: 0 }}
                        >
                            <X size={14} />
                        </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Modal Components with AnimatePresence */}
      <AnimatePresence>
      {showExpenseModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card auth-card" 
            style={{ maxWidth: '500px' }}
          >
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <form onSubmit={onAddExpense}>
              <div className="form-group">
                <input type="text" className="input" placeholder="Description" value={expenseData.description} onChange={(e) => setExpenseData({...expenseData, description: e.target.value})} required />
              </div>
              <div className="form-group">
                <input type="number" className="input" placeholder="Amount (₹)" value={expenseData.amount} onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})} required />
              </div>
              
              <div className="form-group">
                <select className="input" value={expenseData.splitType} onChange={(e) => setExpenseData({...expenseData, splitType: e.target.value})} style={{ background: '#1e293b' }}>
                  <option value="equal">Split Equally</option>
                  <option value="custom">Split Custom</option>
                </select>
              </div>

              {expenseData.splitType === 'custom' && currentGroup.members.map(m => (
                <div key={m._id} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="label" style={{ flex: 1 }}>{m.name}</span>
                  <input type="number" className="input" style={{ width: '120px' }} value={expenseData.customSplits[m._id] || ''} placeholder="Amount" onChange={(e) => setExpenseData({
                    ...expenseData,
                    customSplits: { ...expenseData.customSplits, [m._id]: e.target.value }
                  })} />
                </div>
              ))}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingExpense ? 'Update Expense' : 'Add Expense'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showMemberModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card auth-card"
          >
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Invite Member</h2>
            <form onSubmit={onAddMember}>
              <div className="form-group">
                <label className="label">User Email</label>
                <input type="email" className="input" value={memberEmail} placeholder="Enter email address" onChange={(e) => setMemberEmail(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showEditGroupModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card auth-card"
          >
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
                  <button type="button" onClick={() => setShowEditGroupModal(false)} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default GroupDetail;
