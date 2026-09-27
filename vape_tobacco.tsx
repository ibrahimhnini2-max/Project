import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Package, Users, LayoutDashboard, Plus, Search,
  AlertCircle, CheckCircle2, Trash2, Edit, X, Bell, UserCircle,
  Settings, Keyboard, Check, Sparkles, Target, Calendar, ChevronDown, Loader2,
  Banknote, CreditCard, Smartphone, Wallet, Coins, TrendingUp, Layers,
  Flame, Wind, Zap, Droplets, ScanLine, ArrowUpRight, ArrowDownRight,
  Receipt, RotateCcw, Eye, Printer, PackagePlus, Pause, Play, Download,
  Upload, RefreshCw, Box, Percent, Minus
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const initialInventory = [
  { id: 'P01', category: 'OCB', brand: 'OCB', name: 'XPERT GRIS 25', price: 130, cost: 88, nicotine: '-', puff: '-', stock: 45, minStock: 10, barcode: '6111000001' },
  { id: 'P02', category: 'OCB', brand: 'OCB', name: 'ULTIMATE PREMIUM 40/25', price: 150, cost: 102, nicotine: '-', puff: '-', stock: 32, minStock: 10, barcode: '6111000002' },
  { id: 'P03', category: 'OCB', brand: 'OCB', name: 'SLIM ORO 50', price: 350, cost: 238, nicotine: '-', puff: '-', stock: 18, minStock: 5, barcode: '6111000003' },
  { id: 'P21', category: 'Charbon', brand: 'AL KHAYMA', name: 'CHARBON 33', price: 65, cost: 44, nicotine: '-', puff: '-', stock: 60, minStock: 15, barcode: '6111000021' },
  { id: 'P23', category: 'Charbon', brand: 'AL KHAYMA', name: 'COCO 72', price: 75, cost: 51, nicotine: '-', puff: '-', stock: 8, minStock: 12, barcode: '6111000023' },
  { id: 'P29', category: 'Vape', brand: 'SPACEMAN', name: '25K TRIPLE RASPBERRY', price: 220, cost: 150, nicotine: '-', puff: '25K', stock: 14, minStock: 10, barcode: '6111000029' },
  { id: 'P30', category: 'Vape', brand: 'SPACEMAN', name: '25K WATERMELON DRAGON', price: 220, cost: 150, nicotine: '-', puff: '25K', stock: 4, minStock: 10, barcode: '6111000030' },
  { id: 'P37', category: 'Vape', brand: 'MAVIC', name: 'M4000 PUFF BLUEBERRY ICE', price: 120, cost: 80, nicotine: '5%', puff: '4000', stock: 25, minStock: 10, barcode: '6111000037' },
  { id: 'P44', category: 'Vape', brand: 'ETO BAR', name: 'S600 WATERMELON ICE', price: 65, cost: 44, nicotine: '-', puff: '600', stock: 40, minStock: 10, barcode: '6111000044' },
  { id: 'P54', category: 'Vape', brand: 'PRIV BAR', name: '15000 WATERMELON CHILL', price: 180, cost: 122, nicotine: '-', puff: '15000', stock: 12, minStock: 8, barcode: '6111000054' },
  { id: 'P73', category: 'Nicotine Pouch', brand: 'THOR', name: 'HAMMER NORDIC FREEZE 16mg', price: 275, cost: 187, nicotine: '16mg', puff: '-', stock: 3, minStock: 10, barcode: '6111000073' },
  { id: 'P77', category: 'E-Liquid', brand: 'GOSTO', name: 'VP LIQ 30ml STRAWBERRY 25mg', price: 70, cost: 48, nicotine: '25mg', puff: '-', stock: 20, minStock: 10, barcode: '6111000077' }
];

const CATEGORY_COLORS = {
  'OCB': '#6366f1',
  'Charbon': '#f97316',
  'Vape': '#10b981',
  'Nicotine Pouch': '#f43f5e',
  'E-Liquid': '#0ea5e9'
};

const PAYMENTS = [
  { id: 'cash', label: 'نقداً', icon: Banknote },
  { id: 'card', label: 'بطاقة', icon: CreditCard },
  { id: 'transfer', label: 'تحويل', icon: Smartphone }
];
const paymentLabel = (id) => (PAYMENTS.find(p => p.id === id) || {}).label || id;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vapepro-erp';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(n) || 0);

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const nextOrderId = (sales) => {
  const nums = sales
    .map(s => parseInt(String(s.id).replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  return `ORD-${(nums.length ? Math.max(...nums) : 1000) + 1}`;
};

const downloadCSV = (rows, filename) => {
  const csv = rows
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Modal = ({ children, onClose, maxWidth = 'max-w-lg', title, subtitle }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div
      className={`bg-white w-full ${maxWidth} rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200`}
      onClick={(e) => e.stopPropagation()}
    >
      {title && (
        <div className="flex items-start justify-between p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur rounded-t-3xl z-10">
          <div>
            <h3 className="font-black text-lg text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {children}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, unit, tone = 'indigo', delta, sub }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
    rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600',
    sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600'
  };
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl group-hover:text-white transition-colors ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {delta != null && (
          <span
            className={`flex items-center text-xs font-black px-2 py-1 rounded-lg ${
              delta >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
        {value}
        {unit && <span className="text-sm text-slate-400 font-bold ms-1">{unit}</span>}
      </h3>
      {sub && <p className="text-[11px] text-slate-400 font-medium mt-2">{sub}</p>}
    </div>
  );
};

const SalesTrendChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-48 pt-6">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
          <span className="absolute -top-2 text-[10px] font-black text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded-md shadow-md border border-slate-100 whitespace-nowrap z-10">
            {fmt(d.value)} DH
          </span>
          <div
            className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-700 group-hover:to-indigo-500 transition-all duration-700 min-h-[3px]"
            style={{ height: `${Math.max((d.value / max) * 128, 3)}px` }}
          />
          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ data }) => {
  const sum = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 58;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0 -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {data.map((d, i) => {
          const frac = d.value / sum;
          const dash = frac * C;
          const offset = -acc * C;
          acc += frac;
          return (
            <circle
              key={i}
              cx="80" cy="80" r={R} fill="none"
              stroke={d.color} strokeWidth="20"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="flex-1 space-y-2 min-w-0">
        {data.length === 0 && <p className="text-xs text-slate-400 font-medium">لا توجد بيانات</p>}
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="font-bold text-slate-600 flex-1 truncate">{d.name}</span>
            <span className="font-black text-slate-800">{fmt(d.value)}</span>
            <span className="text-slate-400 font-bold w-10 text-left">
              {((d.value / sum) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ProSalesERP() {
  const [user, setUser] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [inventory, setInventory] = useState(initialInventory);
  const [sales, setSales] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [confirmBox, setConfirmBox] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHeld, setShowHeld] = useState(false);

  const [cart, setCart] = useState([]);
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', city: 'مكناس' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discount, setDiscount] = useState({ type: 'percent', value: 0 });
  const [payment, setPayment] = useState('cash');
  const [heldCarts, setHeldCarts] = useState([]);
  const searchRef = useRef(null);

  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('All');
  const [invSort, setInvSort] = useState('name');
  const [invOnlyLow, setInvOnlyLow] = useState(false);

  const [salesSearch, setSalesSearch] = useState('');
  const [salesRange, setSalesRange] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);

  const [customersSearch, setCustomersSearch] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsDbReady(true);
      return;
    }

    const invRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
    const unsubInv = onSnapshot(invRef, (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setInventory(data);
      } else {
        initialInventory.forEach(async (p) => {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', p.id), p);
        });
      }
    }, (err) => console.error(err));

    const salesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'sales');
    const unsubSales = onSnapshot(salesRef, (snap) => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a,b) => new Date(b.date) - new Date(a.date));
      setSales(data);
      setIsDbReady(true);
    }, (err) => console.error(err));

    return () => {
      unsubInv();
      unsubSales();
    };
  }, [user]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);

  const completedSales = useMemo(() => sales.filter(s => s.status !== 'refunded'), [sales]);

  const lowStockItems = useMemo(
    () => inventory.filter(i => i.stock <= (i.minStock ?? 10)).sort((a, b) => a.stock - b.stock),
    [inventory]
  );

  const metrics = useMemo(() => {
    const today = dayKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = dayKey(yesterdayDate);

    let revenue = 0, profit = 0, cost = 0;
    let todayRevenue = 0, todayProfit = 0, todayOrders = 0;
    let ydayRevenue = 0;

    completedSales.forEach(s => {
      revenue += s.total;
      profit += s.profit ?? (s.total - (s.cost || 0));
      cost += s.cost || 0;
      const k = dayKey(s.date);
      if (k === today) { todayRevenue += s.total; todayProfit += s.profit ?? 0; todayOrders += 1; }
      if (k === yesterday) ydayRevenue += s.total;
    });

    const stockValue = inventory.reduce((a, p) => a + p.cost * p.stock, 0);
    const retailValue = inventory.reduce((a, p) => a + p.price * p.stock, 0);
    const totalUnits = inventory.reduce((a, p) => a + p.stock, 0);
    const avgBasket = completedSales.length ? revenue / completedSales.length : 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const delta = ydayRevenue > 0 ? ((todayRevenue - ydayRevenue) / ydayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);

    return {
      revenue, profit, cost, todayRevenue, todayProfit, todayOrders,
      stockValue, retailValue, totalUnits, avgBasket, margin, delta,
      orders: completedSales.length
    };
  }, [completedSales, inventory]);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const value = completedSales
        .filter(s => dayKey(s.date) === k)
        .reduce((a, s) => a + s.total, 0);
      days.push({
        key: k,
        label: d.toLocaleDateString('ar-MA', { weekday: 'short' }).replace(/\./g, ''),
        value
      });
    }
    return days;
  }, [completedSales]);

  const topProducts = useMemo(() => {
    const map = new Map();
    completedSales.forEach(s =>
      s.items.forEach(it => {
        const cur = map.get(it.id) || { id: it.id, name: it.name, brand: it.brand, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        map.set(it.id, cur);
      })
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [completedSales]);

  const categoryStats = useMemo(() => {
    const map = new Map();
    completedSales.forEach(s =>
      s.items.forEach(it => {
        const prod = inventory.find(p => p.id === it.id);
        const cat = prod?.category || 'Autre';
        map.set(cat, (map.get(cat) || 0) + it.price * it.qty);
      })
    );
    return [...map.entries()]
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [completedSales, inventory]);

  const customers = useMemo(() => {
    const map = new Map();
    sales.forEach(s => {
      if (!s.phone) return;
      const prev = map.get(s.phone) || {
        name: s.client, phone: s.phone, city: s.city,
        orders: 0, total: 0, profit: 0, last: s.date
      };
      prev.orders += 1;
      prev.total += s.total;
      prev.profit += s.profit ?? 0;
      if (new Date(s.date) > new Date(prev.last)) {
        prev.last = s.date;
        prev.name = s.client;
        prev.city = s.city;
      }
      map.set(s.phone, prev);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [sales]);

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartDiscount = useMemo(() => {
    const v = Number(discount.value) || 0;
    if (discount.type === 'percent') {
      return Math.round(cartSubtotal * (Math.min(Math.max(v, 0), 100) / 100) * 100) / 100;
    }
    return Math.min(Math.max(v, 0), cartSubtotal);
  }, [discount, cartSubtotal]);
  const cartTotal = Math.max(cartSubtotal - cartDiscount, 0);
  const cartCost = cart.reduce((s, i) => s + i.cost * i.qty, 0);
  const cartProfit = cartTotal - cartCost;

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) {
      toast('⚠️ هذا المنتج نفذ من المخزون', 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          toast('⚠️ الكمية المطلوبة غير متوفرة في المخزون', 'error');
          return prev;
        }
        return prev.map(i => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }, [toast]);

  const updateCartQty = useCallback((id, newQty) => {
    if (newQty <= 0) {
      setCart(c => c.filter(i => i.id !== id));
      return;
    }
    const product = inventory.find(p => p.id === id);
    if (product && newQty > product.stock) {
      toast('⚠️ الكمية المطلوبة غير متوفرة في المخزون', 'error');
      return;
    }
    setCart(c => c.map(i => (i.id === id ? { ...i, qty: newQty } : i)));
  }, [inventory, toast]);

  const removeFromCart = useCallback((id) => setCart(c => c.filter(i => i.id !== id)), []);
  const clearCart = useCallback(() => {
    if (!cart.length) return;
    setConfirmBox({
      title: 'إفراغ الطلبية',
      message: 'هل أنت متأكد من حذف جميع المنتجات من الطلبية الحالية؟',
      onConfirm: () => {
        setCart([]);
        setDiscount({ type: 'percent', value: 0 });
        toast('تم إفراغ الطلبية');
      }
    });
  }, [cart.length, toast]);

  const confirmSale = useCallback(async () => {
    if (!cart.length) return;
    const newId = nextOrderId(sales);
    const sale = {
      id: newId,
      date: new Date().toISOString(),
      items: cart.map(({ id, name, brand, price, cost, qty }) => ({ id, name, brand, price, cost, qty })),
      subtotal: cartSubtotal,
      discount: cartDiscount,
      total: cartTotal,
      cost: cartCost,
      profit: cartProfit,
      payment,
      client: clientInfo.name.trim() || 'زبون عابر',
      phone: clientInfo.phone.trim(),
      city: clientInfo.city || 'مكناس',
      status: 'completed'
    };

    try {
      if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', newId), sale);
        const batch = writeBatch(db);
        cart.forEach(cartItem => {
          const product = inventory.find(p => p.id === cartItem.id);
          if (product) {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', cartItem.id);
            batch.set(ref, { ...product, stock: Math.max(0, product.stock - cartItem.qty) });
          }
        });
        await batch.commit();
      } else {
        setSales(prev => [sale, ...prev]);
        setInventory(prev => prev.map(p => {
          const ci = cart.find(x => x.id === p.id);
          return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
        }));
      }

      setCart([]);
      setClientInfo({ name: '', phone: '', city: 'مكناس' });
      setDiscount({ type: 'percent', value: 0 });
      setPayment('cash');
      setReceiptSale(sale);
      toast(`✅ تم تأكيد ${sale.id} — ${fmt(sale.total)} DH`);
    } catch (error) {
      toast('⚠️ حدث خطأ أثناء الحفظ', 'error');
      console.error(error);
    }
  }, [cart, sales, cartSubtotal, cartDiscount, cartTotal, cartCost, cartProfit, payment, clientInfo, inventory, toast, user]);

  const refundSale = useCallback((sale) => {
    if (sale.status === 'refunded') return;
    setConfirmBox({
      title: 'إرجاع الطلبية',
      message: `سيتم إرجاع ${sale.id} واستعادة الكميات إلى المخزون. هل تريد المتابعة؟`,
      confirmLabel: 'تأكيد الإرجاع',
      danger: true,
      onConfirm: async () => {
        try {
          if (user) {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', sale.id), { ...sale, status: 'refunded' });
            const batch = writeBatch(db);
            sale.items.forEach(cartItem => {
              const product = inventory.find(p => p.id === cartItem.id);
              if (product) {
                const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', product.id);
                batch.set(ref, { ...product, stock: product.stock + cartItem.qty });
              }
            });
            await batch.commit();
          } else {
            setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'refunded' } : s));
            setInventory(prev => prev.map(p => {
              const found = sale.items.find(i => i.id === p.id);
              return found ? { ...p, stock: p.stock + found.qty } : p;
            }));
          }
          toast(`تم إرجاع ${sale.id} واستعادة المخزون`);
        } catch(e) {
          toast('⚠️ حدث خطأ أثناء الإرجاع', 'error');
        }
      }
    });
  }, [inventory, toast, user]);

  const holdCart = () => {
    if (!cart.length) return;
    setHeldCarts(h => [...h, {
      id: `H-${Date.now()}`,
      items: cart,
      client: clientInfo,
      discount,
      time: new Date().toISOString()
    }]);
    setCart([]);
    setClientInfo({ name: '', phone: '', city: 'مكناس' });
    setDiscount({ type: 'percent', value: 0 });
    toast('تم تعليق الطلبية ⏸️');
  };

  const resumeCart = (h) => {
    if (cart.length) {
      toast('⚠️ أفرغ الطلبية الحالية أولاً', 'error');
      return;
    }
    setCart(h.items);
    setClientInfo(h.client);
    setDiscount(h.discount || { type: 'percent', value: 0 });
    setHeldCarts(list => list.filter(x => x.id !== h.id));
    setShowHeld(false);
    toast('تم استرجاع الطلبية ▶️');
  };

  const generateId = useCallback(() => {
    const nums = inventory
      .map(p => parseInt(String(p.id).replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    return 'P' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0');
  }, [inventory]);

  const saveProduct = async (data) => {
    try {
      let docId = data.id;
      let isNew = false;
      if (!docId) {
        docId = generateId();
        isNew = true;
      }
      const newProd = { ...data, id: docId };
      if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', docId), newProd);
      } else {
        setInventory(prev => {
          const exists = prev.some(p => p.id === docId);
          if (exists) return prev.map(p => p.id === docId ? newProd : p);
          return [newProd, ...prev];
        });
      }
      toast(isNew ? `تمت إضافة «${data.name}»` : `تم تحديث «${data.name}»`);
      setEditingProduct(null);
    } catch(e) {
      toast('⚠️ حدث خطأ أثناء حفظ المنتج', 'error');
    }
  };

  const deleteProduct = (product) => {
    setConfirmBox({
      title: 'حذف منتج',
      message: `سيتم حذف «${product.name}» نهائياً من المخزون.`,
      confirmLabel: 'حذف',
      danger: true,
      onConfirm: async () => {
        try {
          if (user) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', product.id));
          } else {
            setInventory(prev => prev.filter(p => p.id !== product.id));
          }
          toast('تم حذف المنتج');
        } catch(e) { toast('⚠️ حدث خطأ', 'error'); }
      }
    });
  };

  const adjustStock = async (id, delta) => {
    const product = inventory.find(p => p.id === id);
    if (!product) return;
    try {
      const newStock = Math.max(0, (product.stock || 0) + delta);
      const updated = { ...product, stock: newStock };
      if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', id), updated);
      } else {
        setInventory(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch(e) { toast('⚠️ خطأ في تحديث المخزون', 'error'); }
  };

  const posProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return inventory.filter(p => {
      const hay = `${p.name || ''} ${p.brand || ''} ${p.category || ''} ${p.barcode || ''}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchC = selectedCategory === 'All' || p.category === selectedCategory;
      return matchQ && matchC;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const inventoryView = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    let list = inventory.filter(p => {
      const hay = `${p.name || ''} ${p.brand || ''} ${p.category || ''} ${p.barcode || ''} ${p.id || ''}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchC = invCategory === 'All' || p.category === invCategory;
      const matchLow = !invOnlyLow || (p.stock || 0) <= (p.minStock ?? 10);
      return matchQ && matchC && matchLow;
    });
    const sorters = {
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
      'stock-asc': (a, b) => (a.stock || 0) - (b.stock || 0),
      'stock-desc': (a, b) => (b.stock || 0) - (a.stock || 0),
      'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
      'price-asc': (a, b) => (a.price || 0) - (b.price || 0),
      margin: (a, b) => {
        const mA = a.price ? (a.price - (a.cost || 0)) / a.price : 0;
        const mB = b.price ? (b.price - (b.cost || 0)) / b.price : 0;
        return mB - mA;
      },
      value: (a, b) => (b.price || 0) * (b.stock || 0) - (a.price || 0) * (a.stock || 0)
    };
    return [...list].sort(sorters[invSort] || sorters.name);
  }, [inventory, invSearch, invCategory, invOnlyLow, invSort]);

  const salesView = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    const now = new Date();
    let cutoff = null;
    if (salesRange === 'today') cutoff = new Date(dayKey(now)).getTime();
    if (salesRange === '7d') { cutoff = new Date(now); cutoff.setDate(now.getDate() - 7); cutoff = cutoff.getTime(); }
    if (salesRange === '30d') { cutoff = new Date(now); cutoff.setDate(now.getDate() - 30); cutoff = cutoff.getTime(); }

    return sales.filter(s => {
      const hay = `${s.id || ''} ${s.client || ''} ${s.phone || ''} ${(s.items || []).map(i => i.name).join(' ')}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchD = !cutoff || new Date(s.date).getTime() >= cutoff;
      return matchQ && matchD;
    });
  }, [sales, salesSearch, salesRange]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('pos'); setTimeout(() => searchRef.current?.focus(), 60); }
      if (e.key === 'F4' && cart.length) { e.preventDefault(); confirmSale(); }
      if (e.key === 'Escape') {
        setEditingProduct(null); setReceiptSale(null); setConfirmBox(null);
        setShowShortcuts(false); setShowSettings(false); setShowHeld(false); setSelectedSale(null);
      }
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowShortcuts(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, confirmSale]);

  const exportInventoryCSV = () => {
    const rows = [
      ['ID', 'Barcode', 'Category', 'Brand', 'Name', 'Price', 'Cost', 'Margin%', 'Stock', 'MinStock', 'Value'],
      ...inventoryView.map(p => [
        p.id, p.barcode, p.category, p.brand, p.name, p.price, p.cost,
        (((p.price - p.cost) / p.price) * 100).toFixed(1),
        p.stock, p.minStock ?? 10, p.price * p.stock
      ])
    ];
    downloadCSV(rows, `inventory-${dayKey(new Date())}.csv`);
    toast('تم تصدير المخزون إلى CSV');
  };

  const exportSalesCSV = () => {
    const rows = [
      ['Order', 'Date', 'Client', 'Phone', 'City', 'Items', 'Subtotal', 'Discount', 'Total', 'Cost', 'Profit', 'Payment', 'Status'],
      ...salesView.map(s => [
        s.id, formatDate(s.date), s.client, s.phone, s.city,
        s.items.reduce((a, i) => a + i.qty, 0),
        s.subtotal ?? s.total, s.discount ?? 0, s.total,
        s.cost ?? 0, s.profit ?? 0, paymentLabel(s.payment), s.status
      ])
    ];
    downloadCSV(rows, `sales-${dayKey(new Date())}.csv`);
    toast('تم تصدير المبيعات إلى CSV');
  };

  const backupJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ inventory, sales, exportedAt: new Date().toISOString(), version: 4 }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vapepro-backup-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('تم إنشاء نسخة احتياطية');
  };

  const categoriesList = [
    { name: 'All', label: 'الكل', icon: Box },
    { name: 'OCB', label: 'OCB', icon: Package },
    { name: 'Charbon', label: 'فحم', icon: Flame },
    { name: 'Vape', label: 'فيب', icon: Wind },
    { name: 'Nicotine Pouch', label: 'نيكوتين', icon: Zap },
    { name: 'E-Liquid', label: 'سوائل', icon: Droplets }
  ];
  const categoryNames = categoriesList.filter(c => c.name !== 'All').map(c => c.name);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'لوحة القيادة' },
    { id: 'pos', icon: ShoppingCart, label: 'نقطة البيع (POS)' },
    { id: 'inventory', icon: Package, label: 'المخزون (Stock)' },
    { id: 'sales', icon: Receipt, label: 'سجل المبيعات' },
    { id: 'customers', icon: Users, label: 'الزبناء (CRM)' }
  ];

  const tabTitles = {
    dashboard: 'لوحة القيادة الذكية',
    pos: 'نقطة البيع السريعة',
    inventory: 'إدارة المخزون',
    sales: 'سجل المبيعات والفواتير',
    customers: 'إدارة علاقات الزبناء'
  };

  const renderDashboard = () => (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={Wallet} label="مبيعات اليوم" tone="indigo"
          value={fmt(metrics.todayRevenue)} unit="DH"
          delta={metrics.delta}
          sub={`${metrics.todayOrders} طلبية اليوم`}
        />
        <StatCard
          icon={Coins} label="ربح اليوم (صافي)" tone="emerald"
          value={fmt(metrics.todayProfit)} unit="DH"
          sub={`هامش إجمالي ${metrics.margin.toFixed(1)}%`}
        />
        <StatCard
          icon={ShoppingCart} label="متوسط السلة" tone="sky"
          value={fmt(metrics.avgBasket)} unit="DH"
          sub={`${metrics.orders} طلبية إجمالاً`}
        />
        <StatCard
          icon={AlertCircle} label="منتجات تحتاج تزويد" tone="rose"
          value={lowStockItems.length}
          sub={`قيمة المخزون ${fmt(metrics.stockValue)} DH`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> مبيعات آخر 7 أيام
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                الإجمالي: {fmt(trend.reduce((a, d) => a + d.value, 0))} DH
              </p>
            </div>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl">
              {fmt(metrics.revenue)} DH إجمالي تراكمي
            </span>
          </div>
          <SalesTrendChart data={trend} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 mb-5">
            <Layers className="w-5 h-5 text-indigo-500" /> توزيع المبيعات حسب الفئة
          </h3>
          <DonutChart data={categoryStats} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-rose-500 w-5 h-5" /> تنبيهات المخزون
            </h3>
            <button
              onClick={() => { setActiveTab('inventory'); setInvOnlyLow(true); setInvCategory('All'); }}
              className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              عرض الكل
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="font-bold text-sm">المخزون في حالة جيدة</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {lowStockItems.slice(0, 8).map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ background: CATEGORY_COLORS[item.category] || '#94a3b8' }}
                    >
                      {item.category.substring(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500">{item.brand}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => adjustStock(item.id, 10)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-colors ${
                      item.stock === 0
                        ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'
                        : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
                    }`}
                    title="إضافة 10 وحدات"
                  >
                    {item.stock} +10
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 mb-5">
            <Sparkles className="text-amber-500 w-5 h-5" /> الأكثر مبيعاً
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm font-medium">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].qty || 1;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>{i + 1}</span>
                        <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800 shrink-0 ms-2">{p.qty} <span className="text-[9px] text-slate-400">ق</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                        style={{ width: `${(p.qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Receipt className="text-indigo-500 w-5 h-5" /> آخر الطلبات
            </h3>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              السجل الكامل
            </button>
          </div>
          {sales.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm font-medium">لم تُسجّل أي مبيعة بعد</p>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {sales.slice(0, 6).map(sale => (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="w-full text-right flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <p className={`font-black text-xs ${sale.status === 'refunded' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {sale.id}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {sale.client} · {sale.items.length} أصناف · {formatTime(sale.date)}
                    </p>
                  </div>
                  <p className={`font-black text-sm shrink-0 ms-2 ${sale.status === 'refunded' ? 'text-slate-300' : 'text-emerald-600'}`}>
                    {fmt(sale.total)} <span className="text-[9px]">DH</span>
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPOS = () => (
    <div className="flex flex-col lg:flex-row min-h-full lg:h-full overflow-y-auto lg:overflow-hidden bg-slate-50/50 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col min-h-[60vh] lg:min-h-0 lg:overflow-hidden shrink-0 lg:shrink">
        <div className="p-4 md:p-6 bg-white border-b border-slate-200 shadow-sm z-10 flex flex-col gap-4 shrink-0">
          <div className="relative">
            <ScanLine className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="ابحث أو امسح الباركود... (F2)"
              className="w-full pl-4 pr-12 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-800 placeholder-slate-400 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = searchTerm.trim().toLowerCase();
                  if (!q) return;
                  const hit = inventory.find(
                    p => (p.barcode && p.barcode.toLowerCase() === q) || (p.id && p.id.toLowerCase() === q)
                  );
                  if (hit) {
                    addToCart(hit);
                    setSearchTerm('');
                    toast(`أُضيف: ${hit.name}`);
                  } else if (posProducts.length === 1) {
                    addToCart(posProducts[0]);
                    setSearchTerm('');
                  }
                }
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoriesList.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.name;
              const count = cat.name === 'All'
                ? inventory.length
                : inventory.filter(p => p.category === cat.name).length;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-indigo-200'
                  }`}
                >
                  {cat.name !== 'All' && <Icon className="w-4 h-4" />}
                  {cat.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                    isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {posProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Search className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-bold text-sm">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 md:gap-4 pb-8">
              {posProducts.map(product => {
                const cartItem = cart.find(item => item.id === product.id);
                const clickCount = cartItem ? cartItem.qty : 0;
                const isOut = product.stock === 0;
                const isLow = product.stock > 0 && product.stock <= (product.minStock ?? 10);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOut && addToCart(product)}
                    className={`group relative bg-white p-4 rounded-3xl border-2 transition-all duration-300 select-none flex flex-col ${
                      isOut
                        ? 'opacity-60 border-slate-100 bg-slate-50 cursor-not-allowed grayscale-[60%]'
                        : 'border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 cursor-pointer hover:-translate-y-1'
                    }`}
                  >
                    {clickCount > 0 && (
                      <div className="absolute -top-3 -right-3 bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-black shadow-lg shadow-indigo-300/50 border-2 border-white z-10 animate-in zoom-in-50 duration-300">
                        {clickCount}
                      </div>
                    )}
                    {isLow && !isOut && (
                      <span className="absolute -top-2 -left-2 w-5 h-5 bg-orange-500 rounded-full border-2 border-white shadow flex items-center justify-center z-10">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </span>
                    )}

                    <div className="flex justify-between items-start mb-3 gap-1">
                      <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate">
                        {product.brand}
                      </span>
                      {product.puff !== '-' && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
                          {product.puff}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-[13px] leading-snug flex-1 mb-3">
                      {product.name}
                    </h3>

                    <div className="flex flex-col gap-2">
                      <span className="font-black text-lg text-slate-900 leading-none">
                        {product.price} <span className="text-xs text-slate-500 font-normal">DH</span>
                      </span>
                      <div className="w-full h-px bg-slate-100" />
                      <div className="flex justify-between items-center gap-1">
                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                          product.stock > (product.minStock ?? 10)
                            ? 'bg-emerald-50 text-emerald-700'
                            : product.stock > 0
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {product.stock > 0 ? `باقي: ${product.stock}` : 'نفذ'}
                        </span>
                        {product.nicotine !== '-' && (
                          <span className="text-[10px] font-medium text-slate-400">{product.nicotine}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[440px] bg-white flex flex-col border-t-4 lg:border-t-0 border-slate-200 lg:border-r shadow-2xl lg:shadow-none z-20 shrink-0 lg:shrink">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            الطلبية الحالية
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-xl">
              {cart.reduce((a, i) => a + i.qty, 0)} وحدة
            </span>
          </h3>
          <div className="flex items-center gap-1.5">
            {heldCarts.length > 0 && (
              <button
                onClick={() => setShowHeld(true)}
                className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors relative"
                title="الطلبيات المعلّقة"
              >
                <Pause className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {heldCarts.length}
                </span>
              </button>
            )}
            {cart.length > 0 && (
              <>
                <button
                  onClick={holdCart}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  title="تعليق الطلبية"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={clearCart}
                  className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                  title="إفراغ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-5 border-b border-slate-100 space-y-2.5 bg-white shrink-0">
          <input
            type="text"
            placeholder="إسم الزبون (اختياري)"
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium placeholder-slate-400"
            value={clientInfo.name}
            onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="06XXXXXXXX"
              dir="ltr"
              className="w-2/3 px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-left placeholder-slate-400"
              value={clientInfo.phone}
              onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
            />
            <input
              type="text"
              placeholder="المدينة"
              className="w-1/3 px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-center placeholder-slate-400"
              value={clientInfo.city}
              onChange={(e) => setClientInfo({ ...clientInfo, city: e.target.value })}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50 min-h-[220px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60 py-12">
              <ShoppingCart size={56} strokeWidth={1.5} />
              <p className="font-bold text-sm">أضف منتجات لتبدأ البيع</p>
              <p className="text-[11px]">اضغط على أي منتج لإضافته</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2.5 animate-in fade-in slide-in-from-right-4 duration-200"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] text-slate-800 leading-tight truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {item.price} DH / وحدة
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1 bg-slate-50 hover:bg-rose-50 rounded-lg shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="font-black text-indigo-600 text-lg">
                    {fmt(item.price * item.qty)} <span className="text-xs text-slate-400">DH</span>
                  </p>
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100" dir="ltr">
                    <button
                      onClick={() => updateCartQty(item.id, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm hover:text-indigo-600 transition-colors active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={item.qty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/\D/g, ''), 10);
                        if (!isNaN(v)) updateCartQty(item.id, v);
                      }}
                      className="w-9 text-center font-bold text-sm text-slate-900 bg-transparent outline-none"
                    />
                    <button
                      onClick={() => updateCartQty(item.id, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm hover:text-indigo-600 transition-colors active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.06)] relative z-30 shrink-0 space-y-3.5">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENTS.map(p => {
              const Icon = p.icon;
              const active = payment === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border-2 transition-all text-[11px] font-black ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setDiscount(d => ({ ...d, type: 'percent' }))}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  discount.type === 'percent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                <Percent className="w-3.5 h-3.5 inline" />
              </button>
              <button
                onClick={() => setDiscount(d => ({ ...d, type: 'fixed' }))}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  discount.type === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                DH
              </button>
            </div>
            <input
              type="number"
              min="0"
              placeholder="خصم"
              value={discount.value || ''}
              onChange={(e) => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
              className="flex-1 px-3 py-2.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-bold text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>المجموع الفرعي</span>
              <span>{fmt(cartSubtotal)} DH</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-xs font-bold text-rose-500">
                <span>الخصم</span>
                <span>− {fmt(cartDiscount)} DH</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold text-emerald-600">
              <span>الربح المتوقع</span>
              <span>{fmt(cartProfit)} DH</span>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-dashed border-slate-200 mt-2">
              <span className="text-slate-500 font-bold">الإجمالي</span>
              <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                {fmt(cartTotal)} <span className="text-base text-slate-400">DH</span>
              </span>
            </div>
          </div>

          <button
            onClick={confirmSale}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all duration-300 ${
              cart.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 active:scale-[0.98]'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            تأكيد الطلب
            {cart.length > 0 && <span className="text-[10px] opacity-70 font-bold">(F4)</span>}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">إدارة المخزون</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            {inventory.length} منتج · {inventoryView.length} معروض ·{' '}
            <span className="text-rose-600 font-bold">{lowStockItems.length} بحاجة تزويد</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportInventoryCSV}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> تصدير
          </button>
          <button
            onClick={() => setEditingProduct('new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/25 text-sm"
          >
            <Plus className="w-4 h-4" /> إضافة منتج
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
            placeholder="ابحث بالاسم، الماركة، الباركود أو ID..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 transition-all text-sm font-medium"
          />
        </div>

        <select
          value={invCategory}
          onChange={(e) => setInvCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 focus:outline-none focus:border-indigo-400 cursor-pointer"
        >
          {categoriesList.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
        </select>

        <select
          value={invSort}
          onChange={(e) => setInvSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 focus:outline-none focus:border-indigo-400 cursor-pointer"
        >
          <option value="name">ترتيب: الاسم</option>
          <option value="stock-asc">المخزون: الأقل أولاً</option>
          <option value="stock-desc">المخزون: الأكثر أولاً</option>
          <option value="price-desc">الثمن: الأعلى أولاً</option>
          <option value="price-asc">الثمن: الأقل أولاً</option>
          <option value="margin">أعلى هامش ربح</option>
          <option value="value">أعلى قيمة مخزون</option>
        </select>

        <button
          onClick={() => setInvOnlyLow(v => !v)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border ${
            invOnlyLow
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" /> نقص المخزون
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-4">المنتج والماركة</th>
                <th className="px-5 py-4">الفئة</th>
                <th className="px-5 py-4">الخصائص</th>
                <th className="px-5 py-4">الشراء / البيع</th>
                <th className="px-5 py-4">الهامش</th>
                <th className="px-5 py-4 text-center">المخزون</th>
                <th className="px-5 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventoryView.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-bold">
                    لا توجد منتجات مطابقة للفلاتر
                  </td>
                </tr>
              )}
              {inventoryView.map(item => {
                const margin = item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-black text-white shrink-0"
                          style={{ background: CATEGORY_COLORS[item.category] || '#94a3b8' }}
                        >
                          {item.category.substring(0, 3)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.brand} · <span className="font-mono">{item.barcode}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ background: CATEGORY_COLORS[item.category] || '#94a3b8' }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {item.puff !== '-' && (
                        <span className="me-1.5 inline-block bg-slate-50 px-2 py-1 rounded">Puff: {item.puff}</span>
                      )}
                      {item.nicotine !== '-' && (
                        <span className="inline-block bg-slate-50 px-2 py-1 rounded">Nic: {item.nicotine}</span>
                      )}
                      {item.puff === '-' && item.nicotine === '-' && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-black text-slate-800">{item.price} <span className="text-[10px] text-slate-400">DH</span></p>
                      <p className="text-[10px] text-slate-400 font-bold">cost: {item.cost} DH</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                        margin >= 35 ? 'bg-emerald-50 text-emerald-700'
                          : margin >= 25 ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black inline-block min-w-[62px] text-center border ${
                          item.stock > (item.minStock ?? 10)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : item.stock > 0
                            ? 'bg-orange-50 text-orange-700 border-orange-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {item.stock}
                        </span>
                        <button
                          onClick={() => adjustStock(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingProduct(item)}
                          className="p-2 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 10)}
                          className="p-2 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                          title="+10 تزويد"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(item)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSales = () => {
    const viewRevenue = salesView.filter(s => s.status !== 'refunded').reduce((a, s) => a + s.total, 0);
    const viewProfit = salesView.filter(s => s.status !== 'refunded').reduce((a, s) => a + (s.profit || 0), 0);

    return (
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">سجل المبيعات</h2>
            <p className="text-slate-500 font-medium mt-1 text-sm">
              {salesView.length} طلبية معروضة من أصل {sales.length}
            </p>
          </div>
          <button
            onClick={exportSalesCSV}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> تصدير CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 text-white rounded-2xl p-5">
            <p className="text-[11px] font-bold text-slate-400 mb-1">إيرادات المعروض</p>
            <p className="text-2xl font-black">{fmt(viewRevenue)} <span className="text-xs text-slate-400">DH</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 mb-1">صافي الربح</p>
            <p className="text-2xl font-black text-emerald-600">{fmt(viewProfit)} <span className="text-xs text-slate-400">DH</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 mb-1">متوسط السلة</p>
            <p className="text-2xl font-black text-slate-800">
              {fmt(salesView.length ? viewRevenue / salesView.filter(s => s.status !== 'refunded').length || 0 : 0)}
              <span className="text-xs text-slate-400"> DH</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              placeholder="ابحث برقم الطلب، الزبون، الهاتف أو منتج..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {[
              { id: 'today', label: 'اليوم' },
              { id: '7d', label: '7 أيام' },
              { id: '30d', label: '30 يوم' },
              { id: 'all', label: 'الكل' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setSalesRange(r.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                  salesRange === r.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {salesView.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-500">لا توجد طلبيات مطابقة</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {salesView.slice(0, 80).map(sale => (
              <div
                key={sale.id}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 transition-all flex flex-wrap items-center gap-4 ${
                  sale.status === 'refunded' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-[180px] flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    sale.status === 'refunded' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {sale.status === 'refunded' ? <RotateCcw className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-sm flex items-center gap-2">
                      {sale.id}
                      {sale.status === 'refunded' && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black">مُرجعة</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {sale.client} · {sale.items.length} أصناف · {sale.items.reduce((a, i) => a + i.qty, 0)} وحدة
                    </p>
                  </div>
                </div>

                <div className="hidden md:block text-xs font-bold text-slate-500 min-w-[130px]">
                  {formatDate(sale.date)}
                </div>

                <div className="hidden lg:block min-w-[90px]">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg">
                    {paymentLabel(sale.payment)}
                  </span>
                </div>

                <div className="text-left min-w-[100px]">
                  <p className="font-black text-slate-900">{fmt(sale.total)} <span className="text-[10px] text-slate-400">DH</span></p>
                  <p className="text-[10px] font-bold text-emerald-600">+{fmt(sale.profit || 0)} ربح</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setReceiptSale(sale)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="طباعة الفاتورة"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {sale.status !== 'refunded' && (
                    <button
                      onClick={() => refundSale(sale)}
                      className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                      title="إرجاع"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCustomers = () => {
    const list = customers.filter(c =>
      !customersSearch || `${c.name || ''} ${c.phone || ''} ${c.city || ''}`.toLowerCase().includes(customersSearch.toLowerCase())
    );

    return (
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800">قاعدة بيانات الزبناء (CRM)</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            {customers.length} زبون مسجّل — يُبنى تلقائياً من المبيعات
          </p>
        </div>

        {customers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900 text-white rounded-2xl p-5">
              <p className="text-[11px] font-bold text-slate-400 mb-1">إجمالي إيرادات الزبناء</p>
              <p className="text-2xl font-black">{fmt(customers.reduce((a, c) => a + c.total, 0))} <span className="text-xs text-slate-400">DH</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 mb-1">أفضل زبون</p>
              <p className="text-lg font-black text-slate-800 truncate">{customers[0]?.name}</p>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">{fmt(customers[0]?.total)} DH</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 mb-1">متوسط قيمة الزبون</p>
              <p className="text-2xl font-black text-slate-800">
                {fmt(customers.reduce((a, c) => a + c.total, 0) / customers.length)}
                <span className="text-xs text-slate-400"> DH</span>
              </p>
            </div>
          </div>
        )}

        {customers.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="font-bold text-lg text-slate-700">لا يوجد زبناء مسجلين بعد</h3>
            <p className="text-slate-400 mt-2 text-sm">
              أدخل رقم هاتف الزبون في نقطة البيع وسيظهر هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {list.map((customer, index) => (
              <div
                key={customer.phone}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-slate-200 text-slate-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {index < 3 ? index + 1 : <UserCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-base text-slate-800 leading-tight truncate">{customer.name}</h3>
                    <p className="text-slate-500 text-xs mt-1.5 font-mono tracking-wider bg-slate-50 py-1 px-2 rounded-lg inline-block border border-slate-100" dir="ltr">
                      {customer.phone}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">
                        {customer.city}
                      </span>
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg">
                        {customer.orders} طلبية
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الشراء</p>
                    <p className="font-black text-lg text-slate-900">{fmt(customer.total)} <span className="text-xs text-slate-400">DH</span></p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">آخر طلبية</p>
                    <p className="text-[11px] font-bold text-slate-600">{formatDate(customer.last)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const printStyles = `
    @media print {
      body * { visibility: hidden !important; }
      #print-area, #print-area * { visibility: visible !important; }
      #print-area {
        position: fixed !important;
        inset: 0 !important;
        margin: 0 !important;
        padding: 16px !important;
        width: 100% !important;
        background: #fff !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .no-print { display: none !important; }
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  const TopBar = () => (
    <div className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <h2 className="text-lg md:text-xl font-black text-slate-800 truncate">{tabTitles[activeTab]}</h2>
        {activeTab === 'pos' && cart.length > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl">
            <ShoppingCart className="w-3.5 h-3.5" /> {cart.reduce((a, i) => a + i.qty, 0)} وحدة · {fmt(cartTotal)} DH
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button
          onClick={() => setShowShortcuts(true)}
          className="hidden md:flex p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
          title="اختصارات لوحة المفاتيح"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        <button
          onClick={() => { setActiveTab('inventory'); setInvOnlyLow(true); setInvCategory('All'); }}
          className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
          title="تنبيهات المخزون"
        >
          <Bell className="w-5 h-5" />
          {lowStockItems.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
          title="الإعدادات والنسخ الاحتياطي"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-3">
          <div className="text-left">
            <p className="text-sm font-bold text-emerald-600">Cloud Sync</p>
            <p className="text-[11px] text-slate-500">متصل (Real-time)</p>
          </div>
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <UserCircle className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );

  const ProductFormModal = ({ product, onClose }) => {
    const isNew = product === 'new';
    const [form, setForm] = useState(() =>
      isNew
        ? {
            id: '', category: 'Vape', brand: '', name: '', price: '', cost: '',
            nicotine: '-', puff: '-', stock: 0, minStock: 10, barcode: ''
          }
        : { ...product }
    );
    const [error, setError] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = () => {
      if (!form.name || !form.name.trim()) return setError('اسم المنتج مطلوب');
      if (!form.brand || !form.brand.trim()) return setError('الماركة مطلوبة');
      const price = parseFloat(form.price);
      if (isNaN(price) || price <= 0) return setError('الثمن غير صالح');
      const cost = parseFloat(form.cost);
      if (isNaN(cost) || cost < 0) return setError('سعر الشراء غير صالح');

      saveProduct({
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim().toUpperCase(),
        price,
        cost,
        stock: parseInt(form.stock, 10) || 0,
        minStock: parseInt(form.minStock, 10) || 10
      });
    };

    const margin = (() => {
      const p = parseFloat(form.price) || 0;
      const c = parseFloat(form.cost) || 0;
      return p > 0 ? ((p - c) / p) * 100 : 0;
    })();

    const field = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-sm font-medium text-slate-800';
    const label = 'block text-[11px] font-black text-slate-500 mb-1.5';

    return (
      <Modal
        onClose={onClose}
        maxWidth="max-w-2xl"
        title={isNew ? 'إضافة منتج جديد' : `تعديل: ${product.name}`}
        subtitle={isNew ? 'أدخل بيانات المنتج بالكامل' : `ID: ${product.id}`}
      >
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>اسم المنتج *</label>
              <input className={field} value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: 25K TRIPLE RASPBERRY" />
            </div>

            <div>
              <label className={label}>الماركة *</label>
              <input className={field} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="SPACEMAN" />
            </div>

            <div>
              <label className={label}>الفئة *</label>
              <select className={field} value={form.category} onChange={e => set('category', e.target.value)}>
                {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={label}>ثمن البيع (DH) *</label>
              <input type="number" className={field} value={form.price} onChange={e => set('price', e.target.value)} placeholder="220" />
            </div>

            <div>
              <label className={label}>ثمن الشراء (DH) *</label>
              <input type="number" className={field} value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="150" />
            </div>

            <div className="sm:col-span-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500">هامش الربح المتوقع</span>
                <span className={`text-sm font-black ${
                  margin >= 35 ? 'text-emerald-600' : margin >= 25 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {margin.toFixed(1)}% · {fmt((parseFloat(form.price) || 0) - (parseFloat(form.cost) || 0))} DH
                </span>
              </div>
            </div>

            <div>
              <label className={label}>الكمية الحالية</label>
              <input type="number" className={field} value={form.stock} onChange={e => set('stock', e.target.value)} />
            </div>

            <div>
              <label className={label}>حد التنبيه (min stock)</label>
              <input type="number" className={field} value={form.minStock} onChange={e => set('minStock', e.target.value)} />
            </div>

            <div>
              <label className={label}>النيكوتين</label>
              <input className={field} value={form.nicotine} onChange={e => set('nicotine', e.target.value)} placeholder="5% أو -" />
            </div>

            <div>
              <label className={label}>عدد النفخات (Puff)</label>
              <input className={field} value={form.puff} onChange={e => set('puff', e.target.value)} placeholder="15000 أو -" />
            </div>

            <div className="sm:col-span-2">
              <label className={label}>الباركود</label>
              <input className={field} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="6111000001" dir="ltr" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> {isNew ? 'إضافة المنتج' : 'حفظ التعديلات'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const ReceiptModal = ({ sale, onClose }) => (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div id="print-area" className="p-6 bg-white">
        <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl mx-auto flex items-center justify-center mb-2">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">VapePro</h2>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">Meknes Branch · 06 00 00 00 00</p>
          <p className="text-[10px] text-slate-400 mt-0.5">نظام الإدارة التجارية</p>
        </div>

        <div className="text-[11px] space-y-1.5 mb-4 text-slate-600 font-medium">
          <div className="flex justify-between"><span>رقم الطلب</span><span className="font-black text-slate-900">{sale.id}</span></div>
          <div className="flex justify-between"><span>التاريخ</span><span className="font-bold">{formatDate(sale.date)}</span></div>
          <div className="flex justify-between"><span>الزبون</span><span className="font-bold">{sale.client}</span></div>
          {sale.phone && <div className="flex justify-between"><span>الهاتف</span><span className="font-bold" dir="ltr">{sale.phone}</span></div>}
          <div className="flex justify-between"><span>طريقة الأداء</span><span className="font-bold">{paymentLabel(sale.payment)}</span></div>
        </div>

        <div className="border-t border-b border-dashed border-slate-300 py-3 mb-4">
          <div className="space-y-2">
            {sale.items.map((it, i) => (
              <div key={i} className="text-[11px]">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="truncate pe-2">{it.name}</span>
                  <span className="shrink-0">{fmt(it.price * it.qty)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px] mt-0.5">
                  <span>{it.brand}</span>
                  <span>{it.qty} × {it.price} DH</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-[11px] font-bold text-slate-600">
          <div className="flex justify-between"><span>المجموع الفرعي</span><span>{fmt(sale.subtotal ?? sale.total)} DH</span></div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-rose-500"><span>الخصم</span><span>− {fmt(sale.discount)} DH</span></div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-900 mt-2">
            <span className="text-slate-900 font-black">الإجمالي</span>
            <span className="text-2xl font-black text-slate-900">{fmt(sale.total)} <span className="text-xs">DH</span></span>
          </div>
        </div>

        <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-300">
          <p className="text-[10px] text-slate-400 font-bold">شكراً لثقتكم — Thank you!</p>
          <p className="text-[9px] text-slate-300 mt-1">VapePro ERP · {sale.id}</p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex gap-2 no-print bg-slate-50 rounded-b-3xl">
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Printer className="w-4 h-4" /> طباعة الفاتورة
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-black transition-colors text-sm"
        >
          إغلاق
        </button>
      </div>
    </Modal>
  );

  const SaleDetailModal = ({ sale, onClose }) => (
    <Modal
      onClose={onClose}
      maxWidth="max-w-lg"
      title={sale.id}
      subtitle={formatDate(sale.date)}
    >
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black text-slate-400 mb-1">الزبون</p>
            <p className="font-bold text-slate-800 text-sm truncate">{sale.client}</p>
            {sale.phone && <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">{sale.phone}</p>}
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black text-slate-400 mb-1">الأداء</p>
            <p className="font-bold text-slate-800 text-sm">{paymentLabel(sale.payment)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{sale.city}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black text-slate-500 mb-2">المنتجات ({sale.items.length})</p>
          <div className="space-y-2">
            {sale.items.map((it, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-xs truncate">{it.name}</p>
                  <p className="text-[10px] text-slate-400">{it.brand} · {it.qty} × {it.price} DH</p>
                </div>
                <p className="font-black text-slate-800 text-sm shrink-0 ms-2">{fmt(it.price * it.qty)} DH</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>المجموع الفرعي</span><span>{fmt(sale.subtotal ?? sale.total)} DH</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-xs font-bold text-rose-400">
              <span>الخصم</span><span>− {fmt(sale.discount)} DH</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold text-emerald-400">
            <span>الربح</span><span>{fmt(sale.profit || 0)} DH</span>
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-slate-700">
            <span className="font-black">الإجمالي</span>
            <span className="text-2xl font-black">{fmt(sale.total)} <span className="text-xs text-slate-400">DH</span></span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setReceiptSale(sale); onClose(); }}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" /> الفاتورة
          </button>
          {sale.status !== 'refunded' && (
            <button
              onClick={() => { refundSale(sale); onClose(); }}
              className="px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black transition-colors text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> إرجاع
            </button>
          )}
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200" dir="rtl">
      <style>{printStyles}</style>

      <div className="w-[270px] bg-slate-900 text-white flex-col shadow-2xl z-40 hidden lg:flex rounded-l-3xl my-2 ml-2 shrink-0">
        <div className="p-7 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Vape<span className="text-indigo-400">Pro</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">نظام الإدارة التجارية المتطور</p>
        </div>

        <div className="px-5 my-3"><div className="h-px w-full bg-slate-800" /></div>

        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge =
              item.id === 'inventory' && lowStockItems.length > 0 ? lowStockItems.length :
              item.id === 'pos' && cart.length > 0 ? cart.reduce((a, i) => a + i.qty, 0) : null;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="ml-3 h-5 w-5 shrink-0" />
                <span className="flex-1 text-right">{item.label}</span>
                {badge != null && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                    isActive ? 'bg-white/20' : 'bg-rose-500 text-white'
                  }`}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 m-3 bg-slate-800/60 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-[10px] font-black text-slate-300">مبيعات اليوم</p>
          </div>
          <p className="text-xl font-black text-white">{fmt(metrics.todayRevenue)} <span className="text-[10px] text-slate-400">DH</span></p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((metrics.todayRevenue / Math.max(metrics.revenue || 1, 1)) * 100 * 3, 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-2 font-bold">
            {metrics.todayOrders} طلبية · ربح {fmt(metrics.todayProfit)} DH
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <div className="lg:hidden bg-slate-900 text-white p-3 flex justify-between items-center shadow-md z-40 shrink-0">
          <h1 className="text-base font-black flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" /> VapePro
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300"
            >
              <Settings className="w-4 h-4" />
            </button>
            <select
              className="bg-slate-800 border border-slate-700 rounded-xl text-xs p-2 outline-none font-bold focus:ring-2 focus:ring-indigo-500"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {navItems.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </div>
        </div>

        <TopBar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 relative">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'pos' && renderPOS()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'customers' && renderCustomers()}
        </main>
      </div>

      <div className="fixed bottom-6 right-6 lg:right-auto lg:left-6 z-[200] space-y-2.5 max-w-[calc(100vw-3rem)]">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-4 fade-in duration-300"
          >
            {t.type === 'error'
              ? <AlertCircle className="text-amber-400 w-5 h-5 shrink-0" />
              : <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />}
            <p className="font-bold text-sm">{t.message}</p>
          </div>
        ))}
      </div>

      {editingProduct && (
        <ProductFormModal product={editingProduct} onClose={() => setEditingProduct(null)} />
      )}

      {receiptSale && <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />}

      {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}

      {confirmBox && (
        <Modal onClose={() => setConfirmBox(null)} maxWidth="max-w-md">
          <div className="p-6 text-center">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              confirmBox.danger ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="font-black text-lg text-slate-800 mb-2">{confirmBox.title}</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">{confirmBox.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { confirmBox.onConfirm?.(); setConfirmBox(null); }}
                className={`flex-1 py-3 rounded-2xl font-black text-white transition-colors ${
                  confirmBox.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmBox.confirmLabel || 'تأكيد'}
              </button>
              <button
                onClick={() => setConfirmBox(null)}
                className="flex-1 py-3 rounded-2xl font-black bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showHeld && (
        <Modal onClose={() => setShowHeld(false)} maxWidth="max-w-md" title="الطلبيات المعلّقة" subtitle={`${heldCarts.length} طلبية`}>
          <div className="p-6 space-y-3">
            {heldCarts.length === 0 && (
              <p className="text-center text-slate-400 font-bold py-8 text-sm">لا توجد طلبيات معلّقة</p>
            )}
            {heldCarts.map(h => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-sm">{h.client.name || 'زبون عابر'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {h.items.length} أصناف · {fmt(h.items.reduce((a, i) => a + i.price * i.qty, 0))} DH · {formatTime(h.time)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ms-2">
                  <button
                    onClick={() => resumeCart(h)}
                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    title="استرجاع"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHeldCarts(list => list.filter(x => x.id !== h.id))}
                    className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal
          onClose={() => setShowSettings(false)}
          maxWidth="max-w-md"
          title="الإعدادات والبيانات"
          subtitle="النسخ الاحتياطي والاستعادة"
        >
          <div className="p-6 space-y-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[11px] font-black text-slate-500 mb-1">حالة البيانات</p>
              <p className="text-xs font-bold text-slate-700">
                {inventory.length} منتج · {sales.length} طلبية · {customers.length} زبون
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                البيانات محفوظة تلقائياً في متصفحك (localStorage)
              </p>
            </div>

            <button
              onClick={backupJSON}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-all text-right"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">تنزيل نسخة احتياطية</p>
                <p className="text-[11px] text-slate-500 mt-0.5">ملف JSON يحتوي كل البيانات</p>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {showShortcuts && (
        <Modal onClose={() => setShowShortcuts(false)} maxWidth="max-w-md" title="اختصارات لوحة المفاتيح">
          <div className="p-6 space-y-2">
            {[
              { k: 'F2', d: 'الانتقال إلى نقطة البيع + البحث' },
              { k: 'F4', d: 'تأكيد الطلب الحالي' },
              { k: 'Enter', d: 'في البحث: إضافة بالباركود مباشرة' },
              { k: 'Esc', d: 'إغلاق أي نافذة' },
              { k: 'Ctrl + ?', d: 'عرض هذه القائمة' }
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">{s.d}</span>
                <kbd className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black text-slate-700 shadow-sm font-mono">
                  {s.k}
                </kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}