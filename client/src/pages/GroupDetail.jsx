import { useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupById, getGroupBalances, addMember, updateGroup, deleteGroup, removeMember, updateExpense, deleteExpense, reset, setCurrency, getGroupStats } from '../store/groupSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserPlus, Plus, Users, Receipt, ArrowLeft, ArrowRight, TrendingDown, Edit2, Trash2, X, Globe, CheckCircle2, Download, FileText, Table, Search, Filter, SortDesc, Calendar, ArrowUp01, ArrowDown10, MessageSquare, Send, BarChart3, Mic, MicOff, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
  const { currentGroup, balances, groupStats = [], isLoading, currency } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showSettleUpModal, setShowSettleUpModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Confirmation Modal States
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const [expenses, setExpenses] = useState([]);
  const [groupName, setGroupName] = useState('');

  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    category: 'Others',
    splitType: 'equal',
    customSplits: {}
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayer, setFilterPayer] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'amount-high', 'amount-low'
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses', 'settlements', or 'analytics'

  // Comments State
  const [activeCommentExpense, setActiveCommentExpense] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // VoiceSplit State
  const [isListening, setIsListening] = useState(false);

  const onAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`/api/expenses/${activeCommentExpense._id}/comments`, { text: newCommentText }, config);
      setNewCommentText('');
      fetchExpenses(); // Refresh to show new comment
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleVoiceSplit = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Listening... (e.g. "Dinner for 1200")', { 
        icon: '🎙️',
        style: { background: 'hsl(var(--p))', color: 'white' }
      });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      // Smart Parser Logic
      const amountMatch = transcript.match(/\d+/);
      if (amountMatch) {
        const amount = amountMatch[0];
        const description = transcript
          .replace(amount, '')
          .replace('for', '')
          .replace('cost', '')
          .replace('amount', '')
          .replace('is', '')
          .trim();
        
        // Smart Category Detection
        let detectedCat = 'Others';
        const foodKeywords = ['pizza', 'burger', 'lunch', 'dinner', 'food', 'restaurant', 'cafe', 'biryani', 'swiggy', 'zomato'];
        const travelKeywords = ['flight', 'taxi', 'uber', 'ola', 'train', 'bus', 'fuel', 'petrol', 'parking'];
        const shopKeywords = ['amazon', 'shopping', 'clothes', 'flipkart', 'mall', 'myntra'];
        const entKeywords = ['movie', 'netflix', 'game', 'party', 'club', 'celebration'];

        if (foodKeywords.some(k => transcript.includes(k))) detectedCat = 'Food';
        if (travelKeywords.some(k => transcript.includes(k))) detectedCat = 'Travel';
        if (shopKeywords.some(k => transcript.includes(k))) detectedCat = 'Shopping';
        if (entKeywords.some(k => transcript.includes(k))) detectedCat = 'Entertainment';
        
        setExpenseData({
          ...expenseData,
          description: description ? (description.charAt(0).toUpperCase() + description.slice(1)) : 'Voice Expense',
          amount: amount,
          category: detectedCat
        });
        toast.success(`Voice Split: ${description} (${detectedCat})`);
      } else {
        toast.error('Could not detect amount. Try: "Lunch for 500"', { icon: '⚠️' });
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Sync activeCommentExpense when expenses array changes
  useEffect(() => {
    if (activeCommentExpense && expenses) {
      const updated = expenses.find(e => e._id === activeCommentExpense._id);
      if (updated) {
        setActiveCommentExpense(updated);
      }
    }
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Search filter
    if (searchTerm) {
      result = result.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Payer filter
    if (filterPayer !== 'all') {
      result = result.filter(exp => exp.payer?._id === filterPayer);
    }

    // Sort logic
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount-high') return b.amount - a.amount;
      if (sortBy === 'amount-low') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [expenses, searchTerm, filterPayer, sortBy]);

  const actualExpenses = useMemo(() => {
    return filteredExpenses.filter(exp => !exp.isSettlement);
  }, [filteredExpenses]);

  const settlementsHistory = useMemo(() => {
    return filteredExpenses.filter(exp => exp.isSettlement);
  }, [filteredExpenses]);

  // Who's Next? Slot Machine State
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelY, setReelY] = useState(0);
  const [wheelWinner, setWheelWinner] = useState(null);
  const [reelTransition, setReelTransition] = useState({ duration: 0 });

  const ITEM_HEIGHT = 80;

  const handleSpin = () => {
    if (isSpinning || !currentGroup?.members?.length) return;
    
    setIsSpinning(true);
    setWheelWinner(null);
    
    const members = currentGroup.members;
    const winnerIndex = Math.floor(Math.random() * members.length);
    const winner = members[winnerIndex];
    
    // 1. Instant reset to top
    setReelTransition({ duration: 0 });
    setReelY(0);
    
    // 2. Short delay to allow state to settle, then start high-speed spin
    setTimeout(() => {
      setReelTransition({ duration: 4, ease: [0.45, 0.05, 0.55, 0.95] });
      const finalIndex = (members.length * 45) + winnerIndex;
      const finalY = -(finalIndex * ITEM_HEIGHT);
      setReelY(finalY);
    }, 50);
    
    setTimeout(() => {
      setWheelWinner(winner);
      setIsSpinning(false);
    }, 4050); 
  };

  const reelItems = useMemo(() => {
    if (!currentGroup || !currentGroup.members) return [];
    // 50 sets for an "infinite" high-speed feel
    return Array(50).fill(currentGroup.members).flat();
  }, [currentGroup?.members]);

  const [memberEmail, setMemberEmail] = useState('');
  const socket = useRef(null);

  useEffect(() => {
    // Socket initialization - targeting backend on port 5000
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    socket.current = io(socketUrl);
    
    socket.current.on('connect', () => {
      if (id) {
        socket.current.emit('join_group', id);
      }
    });

    socket.current.on('new_comment', ({ expenseId, comment }) => {
      fetchExpenses(); // Fetch latest expenses
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, [id]);

  useEffect(() => {
    dispatch(getGroupById(id));
    dispatch(getGroupBalances(id));
    fetchExpenses();
    if (activeTab === 'analytics') {
      dispatch(getGroupStats(id));
    }
  }, [id, dispatch, activeTab]);

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [99, 102, 241]; // Indigo
    const secondaryColor = [30, 41, 59]; // Dark Slate
    const currencyStr = currency.code === 'INR' ? 'Rs.' : currency.code;

    // 1. Header Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // 2. Branding & Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Splitwise Lite", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(currentGroup.name, 14, 55);

    // 3. Summary Section
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 60, 196, 60);

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GROUP SPENDING: ${currencyStr} ${totalSpent.toFixed(2)}`, 14, 70);

    // 4. Balances Block
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("CURRENT BALANCES SUMMARY:", 14, 82);

    let yPos = 90;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);

    balances.forEach(bal => {
      const isSettled = Math.abs(bal.balance) < 0.01;
      const status = isSettled ? "is settled" : (bal.balance >= 0 ? "is owed" : "owes");
      doc.text(`• ${bal.user.name} ${status} ${currencyStr} ${Math.abs(bal.balance).toFixed(2)}`, 20, yPos);
      yPos += 7;
    });

    // 5. Expense Table
    const tableColumn = ["Date", "Description", "Payer", "Amount"];
    const tableRows = expenses.map(exp => [
      new Date(exp.createdAt).toLocaleDateString(),
      exp.description,
      exp.payer.name,
      `${currencyStr} ${exp.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos + 10,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    // 6. Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`${currentGroup.name}_Expense_Report.pdf`);
  };

  const onAddExpense = async (e) => {
    e.preventDefault();
    const { description, amount, category, splitType, customSplits } = expenseData;

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
      category,
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
      setExpenseData({ description: '', amount: '', category: 'Others', splitType: 'equal', customSplits: {} });
      toast.success(editingExpense ? 'Expense updated' : 'Expense added');
      dispatch(getGroupBalances(id));
      fetchExpenses();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : error.response?.data?.message || 'Something went wrong');
    }
  };

  const onDeleteExpense = async (expenseId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await dispatch(deleteExpense(expenseId)).unwrap();
          toast.success('Expense deleted');
          fetchExpenses();
          dispatch(getGroupBalances(id));
        } catch (error) {
          toast.error(error);
        }
      },
      isDestructive: true
    });
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
      category: exp.category || 'Others',
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
      toast.success('Member added to group');
      dispatch(getGroupBalances(id));
    } catch (err) {
      toast.error(err || 'Member not found or already in group');
    }
  };

  const onRemoveMember = async (memberId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member? Their balances will still be tracked in history.',
      onConfirm: async () => {
        try {
          await dispatch(removeMember({ groupId: id, memberId })).unwrap();
          toast.success('Member removed');
          dispatch(getGroupBalances(id));
        } catch (error) {
          toast.error(error);
        }
      },
      isDestructive: true
    });
  };

  const onUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateGroup({ groupId: id, groupData: { name: groupName } })).unwrap();
      toast.success('Group updated');
      setShowEditGroupModal(false);
    } catch (error) {
      toast.error(error);
    }
  };

  const onDeleteGroup = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group and all its expenses? This action is permanent.',
      onConfirm: async () => {
        try {
          await dispatch(deleteGroup(id)).unwrap();
          toast.success('Group deleted');
          navigate('/');
        } catch (error) {
          toast.error(error);
        }
      },
      isDestructive: true
    });
  };

  const onSettleUp = async (debtor, creditor, amount) => {
    const payload = {
      description: `Settle Up: ${debtor.name} paid ${creditor.name}`,
      amount: parseFloat(amount),
      payer: debtor._id,
      group: id,
      category: 'Others',
      isSettlement: true,
      splitType: 'custom',
      splits: [{ user: creditor._id, amount: parseFloat(amount) }]
    };

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('/api/expenses', payload, config);
      toast.success('Payment recorded');
      dispatch(getGroupBalances(id));
      dispatch(getGroupStats(id));
      fetchExpenses();
      setShowSettleUpModal(false);
    } catch (error) {
      toast.error('Settlement failed');
    }
  };

  if (isLoading || !currentGroup) return <p className="label">Loading group details...</p>;

  const formatAmount = (amt) => `${currency.symbol}${amt.toFixed(2)}`;

  // Calculate Suggested Settlements
  const getSettlements = () => {
    const sorted = [...balances].sort((a, b) => a.balance - b.balance);
    let i = 0, j = sorted.length - 1;
    const suggestions = [];

    const tempBalances = sorted.map(b => ({ ...b }));

    while (i < j) {
      const amount = Math.min(-tempBalances[i].balance, tempBalances[j].balance);
      if (amount > 0.01) {
        suggestions.push({
          from: tempBalances[i].user,
          to: tempBalances[j].user,
          amount: amount
        });
        tempBalances[i].balance += amount;
        tempBalances[j].balance -= amount;
      }
      if (tempBalances[i].balance >= -0.01) i++;
      if (tempBalances[j].balance <= 0.01) j--;
    }
    return suggestions;
  };

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
        </div>        <div className="dashboard-header" style={{ marginBottom: 0, paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'hsl(var(--muted-h))' }}>
              <Users size={20} />
              <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{currentGroup.members.length} Members</span>
            </div>
            <div className="currency-selector" style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.75rem' }}>
              {[{ s: '₹', c: 'INR' }, { s: '$', c: 'USD' }, { s: '€', c: 'EUR' }].map(curr => (
                <button
                  key={curr.c}
                  onClick={() => dispatch(setCurrency({ code: curr.c, symbol: curr.s }))}
                  className={`btn-sm ${currency.code === curr.c ? 'active' : ''}`}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    background: currency.code === curr.c ? 'hsl(var(--p))' : 'transparent',
                    color: currency.code === curr.c ? 'white' : 'hsl(var(--muted-h))',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    transition: 'all 0.2s'
                  }}
                >
                  {curr.s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Utility Section */}
            <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.5rem' }}>
              <button
                onClick={exportToPDF}
                className="btn"
                title="Export PDF"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', width: '42px', height: '42px', padding: 0, display: 'flex', justifyContent: 'center', borderRadius: '0.75rem' }}
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => setShowSettleUpModal(true)}
                className="btn"
                title="Settle Up"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', width: '42px', height: '42px', padding: 0, display: 'flex', justifyContent: 'center', borderRadius: '0.75rem' }}
              >
                <CheckCircle2 size={20} />
              </button>
              <button
                onClick={() => setShowMemberModal(true)}
                className="btn"
                title="Invite Member"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', width: '42px', height: '42px', padding: 0, display: 'flex', justifyContent: 'center', borderRadius: '0.75rem' }}
              >
                <UserPlus size={20} />
              </button>
            </div>

            {/* Action Section */}
            <button
              onClick={() => { setEditingExpense(null); setExpenseData({ description: '', amount: '', category: 'Others', splitType: 'equal', customSplits: {} }); setShowExpenseModal(true); }}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0 1.5rem', height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 20px -6px hsla(var(--p), 0.5)' }}
            >
              <Plus size={20} />
              <span style={{ fontWeight: '800' }}>Add Expense</span>
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
              {activeTab === 'expenses' ? <Receipt size={22} style={{ color: 'hsl(var(--p))' }} /> : <CheckCircle2 size={22} style={{ color: 'hsl(var(--success))' }} />}
              {activeTab === 'expenses' ? 'Recent Expenses' : 'Settlement History'}
            </h2>

            <div className="tab-group" style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => setActiveTab('expenses')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.3s ease', background: activeTab === 'expenses' ? 'hsla(var(--p), 0.15)' : 'transparent', color: activeTab === 'expenses' ? 'white' : 'hsl(var(--muted-h))' }}
              >
                <Receipt size={16} />
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.3s ease', background: activeTab === 'settlements' ? 'hsla(var(--success), 0.15)' : 'transparent', color: activeTab === 'settlements' ? 'white' : 'hsl(var(--muted-h))' }}
              >
                <CheckCircle2 size={16} />
                Settles
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.3s ease', background: activeTab === 'analytics' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'analytics' ? 'white' : 'hsl(var(--muted-h))' }}
              >
                <Activity size={16} />
                Pulse
              </button>
            </div>

            {/* Premium Filter Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-h))', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="input"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '3rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Filter size={14} className="label" />
                    <label className="label" style={{ fontSize: '0.75rem' }}>{activeTab === 'expenses' ? 'Paid By' : 'Sender'}</label>
                  </div>
                  <CustomSelect
                    value={filterPayer}
                    onChange={setFilterPayer}
                    options={[
                      { value: 'all', label: 'Everyone' },
                      ...currentGroup.members.map(m => ({ value: m._id, label: m.name }))
                    ]}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <SortDesc size={14} className="label" />
                    <label className="label" style={{ fontSize: '0.75rem' }}>Sort By</label>
                  </div>
                  <CustomSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'amount-high', label: 'Amount: High to Low' },
                      { value: 'amount-low', label: 'Amount: Low to High' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="expense-list">
              {activeTab === 'analytics' ? (
                /* Analytics View */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: '1rem' }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '2rem',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      marginBottom: '1rem'
                    }}>
                      <TrendingDown size={14} style={{ color: 'rgb(99, 102, 241)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgb(99, 102, 241)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {groupStats.length > 0 ? (
                          (() => {
                            const top = groupStats.reduce((prev, current) => (prev.value > current.value) ? prev : current);
                            if (top.name === 'Food') return 'The Foodies 🍔';
                            if (top.name === 'Travel') return 'The Adventurers ✈️';
                            if (top.name === 'Shopping') return 'The Shopaholics 🛍️';
                            if (top.name === 'Entertainment') return 'The Party Animals 🎉';
                            return 'Balanced Spenders ⚖️';
                          })()
                        ) : 'No Data Available'}
                      </span>
                    </div>
                    <p className="label">Group Spending Personality</p>
                  </div>

                  <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={groupStats.length > 0 ? groupStats : [{ name: 'None', value: 1 }]}
                          innerRadius={80}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {(groupStats.length > 0 ? groupStats : [{ name: 'None', value: 1 }]).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'None' ? 'rgba(255,255,255,0.05)' : [
                                'hsl(var(--p))', 
                                'hsl(var(--success))', 
                                'hsl(var(--warning))', 
                                'hsl(var(--error))', 
                                'rgb(99, 102, 241)'
                              ][index % 5]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(15, 23, 41, 0.95)', 
                            border: '1px solid var(--glass-border)',
                            borderRadius: '0.75rem',
                            color: 'white'
                          }} 
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              ) : (
                /* Expenses/Settlements List */
                <AnimatePresence mode="popLayout">
                  {(activeTab === 'expenses' ? actualExpenses : settlementsHistory).length > 0 ? (
                  (activeTab === 'expenses' ? actualExpenses : settlementsHistory).map((exp) => (
                    <motion.div
                      layout
                      variants={itemVariants}
                      key={exp._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1.25rem',
                        borderBottom: '1px solid var(--glass-border)',
                        position: 'relative',
                        background: exp.isSettlement ? 'rgba(34, 197, 94, 0.02)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        {exp.isSettlement ? (
                          /* Settlement Card Layout */
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div className="member-avatar" style={{ width: '32px', height: '32px', border: '2px solid hsla(var(--p), 0.3)' }}>
                                {exp.payer?.avatar ? <img src={exp.payer.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (exp.payer?.name || 'U').charAt(0)}
                              </div>
                              <ArrowRight size={14} style={{ margin: '0 0.5rem', color: 'hsl(var(--muted-h))', opacity: 0.5 }} />
                              <div className="member-avatar" style={{ width: '32px', height: '32px', border: '2px solid hsla(var(--success), 0.3)' }}>
                                {exp.splits[0]?.user.avatar ? <img src={exp.splits[0].user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (exp.splits[0]?.user.name || 'U').charAt(0)}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Settle Up Payment</p>
                              <p className="label" style={{ fontSize: '0.75rem' }}>
                                <span style={{ color: 'white' }}>{exp.payer?._id === user._id ? 'You' : exp.payer?.name}</span> paid <span style={{ color: 'white' }}>{exp.splits[0]?.user.name}</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Standard Expense Card Layout */
                          <>
                            <div className="member-avatar" style={{ width: '36px', height: '36px', fontSize: '0.75rem', flexShrink: 0 }}>
                              {exp.payer?.avatar ? (
                                <img src={exp.payer.avatar} alt={exp.payer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (exp.payer?.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{exp.description}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <p className="label" style={{ fontSize: '0.8rem' }}>Paid by {exp.payer?._id === user._id ? 'You' : exp.payer?.name}</p>
                                <button 
                                  onClick={() => setActiveCommentExpense(exp)}
                                  style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-h))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                                >
                                  <MessageSquare size={14} />
                                  <span>{exp.comments?.length || 0}</span>
                                </button>
                              </div>

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
                          </>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <p style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          color: exp.isSettlement ? 'hsl(var(--success))' : 'white'
                        }}>
                          {formatAmount(exp.amount)}
                        </p>
                        {exp.isSettlement && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                            <button
                              onClick={() => onDeleteExpense(exp._id)}
                              style={{ background: 'none', border: 'none', color: 'hsl(var(--error)/0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Delete settlement record"
                            >
                              <Trash2 size={12} />
                            </button>
                            <span className="label" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (activeTab === 'expenses' ? expenses : expenses.filter(e => e.isSettlement)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
                    {activeTab === 'expenses' ? <Receipt size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} /> : <CheckCircle2 size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />}
                    <p className="label">No {activeTab} in this group yet.</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '4rem', opacity: 0.9 }}
                  >
                    <div style={{
                      background: 'hsla(var(--p), 0.1)',
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.5rem',
                      border: '1px solid hsla(var(--p), 0.2)'
                    }}>
                      <Filter size={28} style={{ color: 'hsl(var(--p))' }} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>No Matches Found</h3>
                    <p className="label" style={{ fontSize: '0.9rem', maxWidth: '250px', margin: '0 auto' }}>
                      We couldn't find any {activeTab} matching your search or filters.
                    </p>
                    <button
                      onClick={() => { setSearchTerm(''); setFilterPayer('all'); setSortBy('newest'); }}
                      className="btn-sm"
                      style={{
                        marginTop: '1.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'hsl(var(--p))',
                        border: '1px solid hsla(var(--p), 0.3)',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Reset All Filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              )}
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
                      {bal.user.avatar ? (
                        <img
                          src={bal.user.avatar}
                          alt={bal.user.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        bal.user.name.charAt(0).toUpperCase()
                      )}
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
                          {formatAmount(Math.abs(bal.balance))}
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

          <div className="glass-card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <Globe size={20} style={{ color: 'hsl(var(--s))' }} />
              Who's Next?
            </h2>
            <p className="label" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>Decide who pays for the next coffee!</p>

            <div className="slot-machine-container">
              <div className="slot-window">
                <motion.div 
                  className="slot-reel"
                  animate={{ y: reelY }}
                  initial={{ y: 0 }}
                  transition={reelTransition}
                  style={{ filter: isSpinning ? 'blur(2px)' : 'none' }}
                >
                  {reelItems.map((m, i) => (
                    <div key={`${m._id}-${i}`} className="slot-item">
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} />
                      ) : (
                        <div className="avatar-placeholder">{m.name.charAt(0)}</div>
                      )}
                      <span>{m.name}</span>
                    </div>
                  ))}
                </motion.div>
                {wheelWinner && !isSpinning && <div className="winning-glow" />}
              </div>

              <div className="slot-lever-container">
                <button 
                  className="slot-btn" 
                  onClick={handleSpin}
                  disabled={isSpinning}
                >
                  {isSpinning ? 'SPINNING...' : 'PULL LEVER'}
                </button>
              </div>
            </div>

            {wheelWinner && !isSpinning && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '1rem', color: 'hsl(var(--success))', fontWeight: '800' }}
              >
                🎉 {wheelWinner.name} is the lucky one!
              </motion.div>
            )}
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
                <div className="form-group" style={{ position: 'relative' }}>
                  <input type="text" className="input" placeholder="Description" value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} required />
                  <button 
                    type="button"
                    onClick={handleVoiceSplit}
                    className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: isListening ? 'hsl(var(--error))' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: 'white',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: isListening ? '0 0 15px hsla(var(--error), 0.5)' : 'none'
                    }}
                  >
                    {isListening ? <Mic size={16} className="pulse-animation" /> : <Mic size={16} />}
                  </button>
                </div>
                <div className="form-group">
                  <input type="number" className="input" placeholder={`Amount (${currency.symbol})`} value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
                  <CustomSelect
                    value={expenseData.category}
                    onChange={(val) => setExpenseData({ ...expenseData, category: val })}
                    options={[
                      { value: 'Food', label: '🍔 Food' },
                      { value: 'Travel', label: '✈️ Travel' },
                      { value: 'Shopping', label: '🛍️ Shopping' },
                      { value: 'Entertainment', label: '🎉 Entertainment' },
                      { value: 'Others', label: '📦 Others' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <CustomSelect
                    value={expenseData.splitType}
                    onChange={(val) => setExpenseData({ ...expenseData, splitType: val })}
                    options={[
                      { value: 'equal', label: 'Split Equally' },
                      { value: 'custom', label: 'Split Custom' }
                    ]}
                  />
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
      <AnimatePresence>
        {showSettleUpModal && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card auth-card"
              style={{ maxWidth: '500px', width: '90%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Settle Up</h2>
                <button onClick={() => setShowSettleUpModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {getSettlements().length > 0 ? (
                  getSettlements().map((settle, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '-0.5rem' }}>
                          <div className="member-avatar" style={{ width: '36px', height: '36px', border: '2px solid hsl(var(--p))' }}>
                            {settle.from.avatar ? <img src={settle.from.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : settle.from.name.charAt(0)}
                          </div>
                          <ArrowRight size={14} style={{ margin: '0 0.5rem', color: 'hsl(var(--muted-h))' }} />
                          <div className="member-avatar" style={{ width: '36px', height: '36px', border: '2px solid hsl(var(--p))' }}>
                            {settle.to.avatar ? <img src={settle.to.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : settle.to.name.charAt(0)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{settle.from.name}</p>
                          <p className="label" style={{ fontSize: '0.7rem' }}>owes {settle.to.name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '800', fontSize: '1.1rem', color: 'hsl(var(--success))', marginBottom: '0.5rem' }}>
                          {formatAmount(settle.amount)}
                        </p>
                        {settle.to._id === user._id || (isCreator && settle.from._id !== user._id) ? (
                          <button
                            onClick={() => onSettleUp(settle.from, settle.to, settle.amount)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                          >
                            Record Payment
                          </button>
                        ) : settle.from._id === user._id ? (
                          <button
                            onClick={() => onSettleUp(settle.from, settle.to, settle.amount)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', background: 'hsl(var(--p))' }}
                          >
                            Pay {settle.to.name}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <CheckCircle2 size={48} style={{ color: 'hsl(var(--success))', marginBottom: '1rem', opacity: 0.5 }} />
                    <p className="label">Everyone is settled up!</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSettleUpModal(false)}
                className="btn"
                style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCommentExpense && (
          <div 
            className="modal-overlay" 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.8)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              zIndex: 9999, // Very high z-index to stay above navbars
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setActiveCommentExpense(null)} // Click outside to close
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card"
              style={{ 
                width: '100%', 
                maxWidth: '420px', 
                height: '100%', 
                borderRadius: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '2.5rem 2rem',
                borderLeft: '1px solid var(--glass-border)',
                background: 'rgba(15, 23, 42, 0.95)' // Darker base for better contrast
              }}
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                  <h2 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Comments</h2>
                  <p className="label" style={{ fontSize: '0.9rem', color: 'hsl(var(--p))', fontWeight: '600' }}>#{activeCommentExpense.description}</p>
                </div>
                <button 
                  onClick={() => setActiveCommentExpense(null)} 
                  className="close-btn-circle"
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', 
                    cursor: 'pointer', 
                    flexShrink: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                {activeCommentExpense.comments?.length > 0 ? (
                  activeCommentExpense.comments.map((comment) => (
                    <div key={comment._id} style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                      <div className="member-avatar" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                        {comment.user?.avatar ? <img src={comment.user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (comment.user?.name || 'U').charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{comment.user?._id === user._id ? 'You' : comment.user?.name}</span>
                          {comment.user?._id === user._id && (
                            <button onClick={() => onDeleteComment(comment._id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--error)/0.5)', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-h)/0.9)', lineHeight: 1.4 }}>{comment.text}</p>
                        <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-h))', marginTop: '0.2rem' }}>
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
                    <MessageSquare size={48} style={{ marginBottom: '1rem', strokeWidth: 1 }} />
                    <p className="label">No comments yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <form onSubmit={onAddComment} style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ask a question..." 
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  style={{ paddingRight: '3.5rem' }}
                />
                <button 
                  type="submit" 
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'hsl(var(--p))', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', opacity: newCommentText.trim() ? 1 : 0.5 }}
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
      />
    </div>
  );
}

export default GroupDetail;
