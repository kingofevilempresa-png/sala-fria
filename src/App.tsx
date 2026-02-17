import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Package, Layers, X, Save, Search, Minus, History, Scaling, Calendar, Weight, ChevronRight, CheckCircle2, AlertCircle, ArrowRight, Loader2, LogOut, User, Lock, Mail, Menu } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

interface Item {
    id: string;
    name: string;
    category: string;
    unit: string;
    value: number;
}

interface Category {
    id: string;
    name: string;
}

interface Gramature {
    id: string;
    name: string;
    weight: string;
}

interface HistoryEntry {
    id: string;
    itemId: string;
    itemName: string;
    type: 'add' | 'remove' | 'create' | 'delete' | 'edit';
    amount: number;
    previousValue?: number;
    timestamp: string;
}

interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const UNITS = [
    'Quilos',
    'Gramas',
    'Unidades',
    'Porção',
    'Caixa',
    'Caixote Verde'
];

const App: React.FC = () => {
    // --- Debug Check ---
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return (
            <div style={{ color: 'white', background: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#ef4444' }}>Erro de Configuração</h1>
                <p>As chaves de acesso ao banco de dados não foram encontradas.</p>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginTop: '20px', fontSize: '0.8rem' }}>
                    <p>URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ OK' : '❌ Faltando'}</p>
                    <p>KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ OK' : '❌ Faltando'}</p>
                </div>
            </div>
        );
    }

    // --- Auth State ---
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // --- App States ---
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [gramatures, setGramatures] = useState<Gramature[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'gramature'>('inventory');
    const [appMode, setAppMode] = useState<'complete' | 'fast'>(() => {
        const saved = localStorage.getItem('sala-fria-mode');
        return (saved as 'complete' | 'fast') || 'complete';
    });
    const [fastAmount, setFastAmount] = useState<number>(1);

    useEffect(() => {
        localStorage.setItem('sala-fria-mode', appMode);
        // Reset multiplier to 1 when leaving fast mode (as per user request)
        if (appMode === 'complete') {
            setFastAmount(1);
        }
    }, [appMode]);

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isGramatureModalOpen, setIsGramatureModalOpen] = useState(false);

    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
    const [adjustValue, setAdjustValue] = useState('');

    const [newItem, setNewItem] = useState({ name: '', category: '', unit: '', value: '' });
    const [newGramature, setNewGramature] = useState({ name: '', weight: '' });
    const [newCategory, setNewCategory] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // --- Auth Effects ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- Fetch Data ---
    const fetchData = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const [itemsRes, catsRes, gramRes, histRes] = await Promise.all([
                supabase.from('items').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('gramatures').select('*'),
                supabase.from('history').select('*').order('timestamp', { ascending: false }).limit(100)
            ]);

            if (itemsRes.data) setItems(itemsRes.data);
            if (catsRes.data) setCategories(catsRes.data);
            if (gramRes.data) setGramatures(gramRes.data);
            if (histRes.data) setHistory(histRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            addNotification('Erro ao carregar dados do banco.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session]);

    // --- Auth Handlers ---
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setLoading(true);

        const formattedEmail = email.includes('@') ? email : `${email.toLowerCase().trim()}@salafria.com`;

        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formattedEmail,
                    password
                });
                if (error) throw error;
                addNotification('Bem-vindo de volta!', 'success');
            } else {
                const { error } = await supabase.auth.signUp({
                    email: formattedEmail,
                    password
                });
                if (error) throw error;
                addNotification('Conta criada com sucesso!', 'success');
            }
        } catch (error: any) {
            setAuthError(error.message);
            addNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setItems([]);
        setCategories([]);
        setGramatures([]);
        setHistory([]);
        addNotification('Sessão encerrada.', 'info');
    };

    // --- Handlers ---
    const addNotification = (message: string, type: Notification['type'] = 'success') => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };

    const logHistory = async (itemId: string, itemName: string, type: HistoryEntry['type'], amount: number, previousValue?: number) => {
        const entry = {
            item_id: itemId,
            item_name: itemName,
            type,
            amount,
            previous_value: previousValue
        };

        const { data, error } = await supabase.from('history').insert([entry]).select();
        if (error) console.error('Error logging history:', error);
        if (data) setHistory(prev => [data[0], ...prev].slice(0, 100));
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.category || !newItem.unit || !newItem.value) return;

        if (editingItem) {
            const updatedItem = {
                name: newItem.name,
                category: newItem.category,
                unit: newItem.unit,
                value: parseFloat(newItem.value)
            };

            const { error } = await supabase.from('items').update(updatedItem).eq('id', editingItem.id);

            if (error) {
                addNotification('Erro ao atualizar item.', 'error');
                return;
            }

            setItems(items.map(item => item.id === editingItem.id ? { ...item, ...updatedItem } : item));
            await logHistory(editingItem.id, newItem.name, 'edit', 0, editingItem.value);
            addNotification(`Item "${newItem.name}" atualizado com sucesso!`);
            setEditingItem(null);
        } else {
            const itemToCreate = {
                name: newItem.name,
                category: newItem.category,
                unit: newItem.unit,
                value: parseFloat(newItem.value),
            };

            const { data, error } = await supabase.from('items').insert([itemToCreate]).select();

            if (error || !data) {
                addNotification('Erro ao criar item.', 'error');
                return;
            }

            setItems([...items, data[0]]);
            await logHistory(data[0].id, data[0].name, 'create', data[0].value);
            addNotification(`Item "${data[0].name}" criado com sucesso!`);
        }
        setNewItem({ name: '', category: '', unit: '', value: '' });
        setIsItemModalOpen(false);
    };

    const handleDeleteItem = async (id: string, name: string) => {
        const itemToDelete = items.find(i => i.id === id);
        if (confirm(`Excluir "${name}"?`)) {
            const { error } = await supabase.from('items').delete().eq('id', id);
            if (error) {
                addNotification('Erro ao excluir item.', 'error');
                return;
            }
            setItems(items.filter(item => item.id !== id));
            await logHistory(id, name, 'delete', 0, itemToDelete?.value);
            addNotification(`Item "${name}" excluído.`, 'info');
        }
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setNewItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            value: item.value.toString()
        });
        setIsItemModalOpen(true);
    };

    const handleConfirmAdjust = async (customItem?: Item, customValue?: string, customType?: 'add' | 'remove') => {
        const itemToAdjust = customItem || adjustingItem;
        const valueToUse = customValue || adjustValue;
        const typeToUse = customType || adjustType;

        if (!itemToAdjust || !valueToUse) return;
        const amount = parseFloat(valueToUse);
        if (isNaN(amount)) return;

        const newValue = typeToUse === 'add'
            ? itemToAdjust.value + amount
            : Math.max(0, itemToAdjust.value - amount);

        const { error } = await supabase.from('items').update({ value: newValue }).eq('id', itemToAdjust.id);

        if (error) {
            addNotification('Erro ao ajustar estoque.', 'error');
            return;
        }

        setItems(prevItems => prevItems.map(item =>
            item.id === itemToAdjust.id ? { ...item, value: newValue } : item
        ));

        await logHistory(itemToAdjust.id, itemToAdjust.name, typeToUse, amount, itemToAdjust.value);
        addNotification(`${typeToUse === 'add' ? 'Adicionado' : 'Removido'} ${amount} ${itemToAdjust.unit} de "${itemToAdjust.name}".`);
        setIsAdjustModalOpen(false);
        setAdjustingItem(null);
        setAdjustValue('');
    };

    const handleAddGramature = async () => {
        if (!newGramature.name || !newGramature.weight) return;
        const entryToAdd = {
            name: newGramature.name,
            weight: newGramature.weight
        };

        const { data, error } = await supabase.from('gramatures').insert([entryToAdd]).select();

        if (error || !data) {
            addNotification('Erro ao salvar gramatura.', 'error');
            return;
        }

        setGramatures([...gramatures, data[0]]);
        setNewGramature({ name: '', weight: '' });
        setIsGramatureModalOpen(false);
        addNotification('Gramatura salva com sucesso!');
    };

    const handleDeleteGramature = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a gramatura de "${name}"?`)) {
            const { error } = await supabase.from('gramatures').delete().eq('id', id);
            if (error) {
                addNotification('Erro ao excluir gramatura.', 'error');
                return;
            }
            setGramatures(gramatures.filter(g => g.id !== id));
            addNotification('Gramatura removida.', 'info');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory) return;
        const { data, error } = await supabase.from('categories').insert([{ name: newCategory }]).select();

        if (error || !data) {
            addNotification('Erro ao adicionar categoria.', 'error');
            return;
        }

        setCategories([...categories, data[0]]);
        setNewCategory('');
    };

    const handleDeleteCategory = async (id: string) => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
            addNotification('Erro ao excluir categoria.', 'error');
            return;
        }
        setCategories(categories.filter(x => x.id !== id));
    };

    // --- Filter and Sort ---
    const sortedAndFilteredItems = items
        .filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const sortedGramatures = [...gramatures].sort((a, b) => a.name.localeCompare(b.name));

    if (authLoading) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px' }}>
                <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Package size={32} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Sala Fria.</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {authMode === 'login' ? 'Bem-vindo de volta! Faça login para continuar.' : 'Crie sua conta para começar a gerenciar.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Usuário</label>
                            <input
                                type="text"
                                placeholder="Seu nome de usuário"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={14} /> Senha</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {authError && (
                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} /> {authError}
                            </div>
                        )}

                        <button className="primary" style={{ width: '100%', justifyContent: 'center', height: '48px' }} disabled={loading}>
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <button
                            onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                            style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 500 }}
                        >
                            {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
                        </button>
                    </div>
                </div>

                {/* Toast Notifications in Auth */}
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notifications.map(n => (
                        <div key={n.id} className="glass-card animate-in" style={{ padding: '16px 20px', minWidth: '300px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `4px solid ${n.type === 'success' ? 'var(--success)' : 'var(--danger)'}` }}>
                            {n.type === 'success' ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} /> : <AlertCircle size={20} style={{ color: 'var(--danger)' }} />}
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{n.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (loading && items.length === 0) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Sincronizando com a nuvem...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Toast Notifications */}
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map(n => (
                    <div key={n.id} className="glass-card animate-in" style={{
                        padding: '16px 20px',
                        minWidth: '300px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderLeft: `4px solid ${n.type === 'success' ? 'var(--success)' : n.type === 'error' ? 'var(--danger)' : 'var(--accent-primary)'}`
                    }}>
                        {n.type === 'success' ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} /> : <AlertCircle size={20} style={{ color: 'var(--accent-primary)' }} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{n.message}</span>
                    </div>
                ))}
            </div>

            <header className="header animate-in" style={{ padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            className="secondary"
                            style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
                            onClick={() => setIsMenuOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Sala Fria.</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* THE INTERRUPTOR (Mode Toggle) - Stays Outside */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--card-border)' }}>
                            <button
                                onClick={() => setAppMode('fast')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: appMode === 'fast' ? 'var(--accent-primary)' : 'transparent',
                                    color: appMode === 'fast' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                Rápido
                            </button>
                            <button
                                onClick={() => setAppMode('complete')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: appMode === 'complete' ? 'var(--accent-primary)' : 'transparent',
                                    color: appMode === 'complete' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                Completo
                            </button>
                        </div>

                        {appMode === 'fast' && (
                            <div style={{ display: 'flex', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '12px', padding: '4px', border: '1px solid var(--accent-primary)' }}>
                                {[1, 5, 10].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setFastAmount(amt)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            background: fastAmount === amt ? 'var(--accent-primary)' : 'transparent',
                                            color: fastAmount === amt ? 'white' : 'var(--text-secondary)',
                                            minWidth: '40px'
                                        }}
                                    >
                                        x{amt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDE MENU (HAMBURGER MENU) */}
                {isMenuOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setIsMenuOpen(false)}>
                        <div
                            className="glass-card animate-in-right"
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: '320px',
                                padding: '32px',
                                background: 'var(--card-bg)',
                                borderLeft: '1px solid var(--card-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Menu</h2>
                                <button className="secondary" style={{ padding: '8px' }} onClick={() => setIsMenuOpen(false)}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={20} color="white" />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{session.user.email?.split('@')[0]}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Usuário Ativo</p>
                                    </div>
                                </div>
                                <button
                                    className="secondary"
                                    onClick={handleLogout}
                                    style={{ width: '100%', justifyContent: 'center', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    <LogOut size={16} /> Sair da Conta
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginLeft: '4px' }}>Navegação</p>
                                <button className={activeTab === 'inventory' ? 'primary' : 'secondary'} style={{ textAlign: 'left', padding: '12px 16px' }} onClick={() => { setActiveTab('inventory'); setIsMenuOpen(false); }}>
                                    <Package size={18} /> Inventário
                                </button>
                                {appMode === 'complete' && (
                                    <>
                                        <button className={activeTab === 'gramature' ? 'primary' : 'secondary'} style={{ textAlign: 'left', padding: '12px 16px' }} onClick={() => { setActiveTab('gramature'); setIsMenuOpen(false); }}>
                                            <Scaling size={18} /> Gramaturas
                                        </button>
                                        <button className={activeTab === 'history' ? 'primary' : 'secondary'} style={{ textAlign: 'left', padding: '12px 16px' }} onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }}>
                                            <History size={18} /> Histórico de Ações
                                        </button>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginLeft: '4px' }}>Ações Rápidas</p>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input type="text" placeholder="Buscar no estoque..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingLeft: '40px' }} />
                                </div>
                                {appMode === 'complete' && (
                                    <>
                                        {activeTab === 'inventory' && (
                                            <>
                                                <button className="secondary" style={{ width: '100%' }} onClick={() => { setIsCategoryModalOpen(true); setIsMenuOpen(false); }}><Layers size={18} /> Gerenciar Categorias</button>
                                                <button className="primary" style={{ width: '100%' }} onClick={() => { setEditingItem(null); setNewItem({ name: '', category: '', unit: '', value: '' }); setIsItemModalOpen(true); setIsMenuOpen(false); }}><Plus size={18} /> Adicionar Novo Item</button>
                                            </>
                                        )}
                                        {activeTab === 'gramature' && (
                                            <button className="primary" style={{ width: '100%' }} onClick={() => { setIsGramatureModalOpen(true); setIsMenuOpen(false); }}><Plus size={18} /> Nova Gramatura</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <main className="items-grid">
                    {sortedAndFilteredItems.length === 0 && !loading ? (
                        <div className="glass-card empty-state animate-in" style={{ gridColumn: '1 / -1' }}><h3>Sem itens no estoque</h3></div>
                    ) : (
                        sortedAndFilteredItems.map(item => (
                            <div key={item.id} className="glass-card item-card animate-in">
                                <div className="item-header">
                                    <div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <span className="item-category">{item.category}</span>
                                            <span className="item-category" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-secondary)' }}>{item.unit}</span>
                                        </div>
                                        <p className="item-name" style={{ marginTop: '10px' }}>{item.name}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="item-value">{item.value.toLocaleString('pt-BR')}</div>
                                        {appMode === 'complete' && (
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                                <button className="secondary" style={{ padding: '6px' }} onClick={() => handleEditItem(item)}><Edit2 size={12} /></button>
                                                <button className="danger" style={{ padding: '6px' }} onClick={() => handleDeleteItem(item.id, item.name)}><Trash2 size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="item-actions" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '12px' }}>
                                    <button
                                        className="secondary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => {
                                            if (appMode === 'fast') {
                                                handleConfirmAdjust(item, fastAmount.toString(), 'remove');
                                            } else {
                                                setAdjustingItem(item); setAdjustType('remove'); setAdjustValue(''); setIsAdjustModalOpen(true);
                                            }
                                        }}
                                    >
                                        <Minus size={16} /> {appMode === 'fast' ? `Remover x${fastAmount}` : 'Remover'}
                                    </button>
                                    <button
                                        className="primary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => {
                                            if (appMode === 'fast') {
                                                handleConfirmAdjust(item, fastAmount.toString(), 'add');
                                            } else {
                                                setAdjustingItem(item); setAdjustType('add'); setAdjustValue(''); setIsAdjustModalOpen(true);
                                            }
                                        }}
                                    >
                                        <Plus size={16} /> {appMode === 'fast' ? `Adicionar x${fastAmount}` : 'Adicionar'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </main>
            )}

            {/* GRAMATURE TAB */}
            {activeTab === 'gramature' && (
                <main className="animate-in">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h2>Tabela de Gramaturas</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '24px' }}>
                            {sortedGramatures.length === 0 && !loading ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma gramatura cadastrada.</p>
                            ) : (
                                sortedGramatures.map(g => (
                                    <div key={g.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Weight size={20} style={{ color: 'var(--accent-primary)' }} />
                                            <div><p style={{ fontWeight: 600 }}>{g.name}</p><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Peso: {g.weight}</p></div>
                                        </div>
                                        <button className="danger" style={{ padding: '8px' }} onClick={() => handleDeleteGramature(g.id, g.name)}><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <main className="animate-in">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h2>Histórico</h2>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.length === 0 && !loading ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Sem movimentações registradas.</p>
                            ) : (
                                history.map((entry: any) => (
                                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: entry.type === 'add' ? 'rgba(16,185,129,0.1)' : entry.type === 'remove' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: entry.type === 'add' ? 'var(--success)' : entry.type === 'remove' ? 'var(--danger)' : 'var(--accent-primary)' }}>{entry.type === 'add' ? <Plus size={18} /> : entry.type === 'remove' ? <Minus size={18} /> : <Calendar size={18} />}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600 }}>{entry.item_name}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {entry.type === 'add' ? 'Adicionado' : entry.type === 'remove' ? 'Removido' : entry.type === 'create' ? 'Criado' : entry.type === 'delete' ? 'Excluído' : 'Editado'}
                                            </p>
                                        </div>

                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                {entry.previous_value !== undefined && (
                                                    <>
                                                        <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{entry.previous_value}</span>
                                                        <ArrowRight size={10} style={{ opacity: 0.4 }} />
                                                    </>
                                                )}
                                                <span style={{ fontWeight: 700, color: entry.type === 'add' ? 'var(--success)' : entry.type === 'remove' ? 'var(--danger)' : 'inherit' }}>
                                                    {entry.amount !== 0 ? (entry.type === 'add' ? `+${entry.amount}` : entry.type === 'remove' ? `-${entry.amount}` : entry.amount) : '0'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.5 }}>{new Date(entry.timestamp).toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            )}

            {/* MODALS */}
            {isItemModalOpen && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <h2>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
                        <div className="form-group"><label>Nome</label><input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group"><label>Categoria</label><select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                            <div className="form-group"><label>Unidade</label><select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}><option value="">Selecione...</option>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                        </div>
                        <div className="form-group"><label>Valor Inicial</label><input type="number" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} /></div>
                        <button className="primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleAddItem}><Save size={18} /> {editingItem ? 'Salvar Alterações' : 'Criar Item'}</button>
                        <button className="secondary" style={{ width: '100%' }} onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {isAdjustModalOpen && adjustingItem && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content animate-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><h2 style={{ fontSize: '1.2rem' }}>{adjustType === 'add' ? 'Adicionar ao' : 'Remover do'} Estoque</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{adjustingItem.name} ({adjustingItem.unit})</p></div>
                            <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'transparent' }}><X size={24} /></button>
                        </div>
                        <div className="form-group"><label>Quantidade</label><input type="number" autoFocus placeholder="0.00" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirmAdjust()} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Atual</div><div style={{ fontWeight: 600 }}>{adjustingItem.value}</div></div>
                            <ChevronRight size={16} style={{ opacity: 0.3 }} />
                            <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Novo</div><div style={{ fontWeight: 700, color: adjustType === 'add' ? 'var(--success)' : 'var(--danger)' }}>{adjustValue ? (adjustType === 'add' ? adjustingItem.value + parseFloat(adjustValue) : Math.max(0, adjustingItem.value - parseFloat(adjustValue))) : '-'}</div></div>
                        </div>
                        <button className="primary" style={{ width: '100%' }} onClick={() => handleConfirmAdjust()}>Confirmar Ajuste</button>
                    </div>
                </div>
            )}

            {isGramatureModalOpen && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <h2>Nova Gramatura</h2>
                        <div className="form-group"><label>Item</label><input type="text" placeholder="Ex: Filé" value={newGramature.name} onChange={e => setNewGramature({ ...newGramature, name: e.target.value })} /></div>
                        <div className="form-group"><label>Peso</label><input type="text" placeholder="Ex: 220g" value={newGramature.weight} onChange={e => setNewGramature({ ...newGramature, weight: e.target.value })} /></div>
                        <button className="primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleAddGramature}><Save size={18} /> Salvar Gramatura</button>
                        <button className="secondary" style={{ width: '100%' }} onClick={() => setIsGramatureModalOpen(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <h2>Categorias</h2>
                        <div style={{ display: 'flex', gap: '8px' }}><input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ flex: 1 }} /><button className="primary" onClick={handleAddCategory}><Plus size={18} /></button></div>
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{categories.map(c => (<div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}><span>{c.name}</span><button className="danger" style={{ padding: '4px' }} onClick={() => handleDeleteCategory(c.id)}><Trash2 size={14} /></button></div>))}</div>
                        <button className="secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setIsCategoryModalOpen(false)}>Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
