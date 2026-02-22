import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Package, Layers, X, Save, Search, Minus, History, Scaling, Calendar, Weight, ChevronRight, CheckCircle2, AlertCircle, ArrowRight, Loader2, LogOut, User, Lock, Mail, Zap, List, Video, Menu, CheckSquare, ClipboardList, ShoppingCart, Send, ShieldCheck, Droplets, Download, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

interface Item {
    id: string;
    name: string;
    category: string;
    unit: string;
    value: number;
    min_value?: number | null;
    location?: string;
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

interface VideoCard {
    id: string;
    title: string;
    description?: string;
    video_url: string;
    created_at: string;
}

interface HistoryEntry {
    id: string;
    item_id: string;
    item_name: string;
    type: 'add' | 'remove' | 'create' | 'delete' | 'edit';
    amount: number;
    previous_value?: number;
    timestamp: string;
    pending?: boolean;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    created_at: string;
}

interface HygieneTask {
    id: string;
    title: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    completed: boolean;
    last_completed?: string;
}

interface Location {
    id: string;
    name: string;
    created_at?: string;
}

interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const UNITS = [
    'kg',
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

    // --- App States (Loaded from Local Storage for instant offline access) ---
    const [items, setItems] = useState<Item[]>(() => {
        const saved = localStorage.getItem('sala-fria-items');
        return saved ? JSON.parse(saved) : [];
    });
    const [categories, setCategories] = useState<Category[]>(() => {
        const saved = localStorage.getItem('sala-fria-categories');
        return saved ? JSON.parse(saved) : [];
    });
    const [gramatures, setGramatures] = useState<Gramature[]>(() => {
        const saved = localStorage.getItem('sala-fria-gramatures');
        return saved ? JSON.parse(saved) : [];
    });
    const [locations, setLocations] = useState<Location[]>(() => {
        const saved = localStorage.getItem('sala-fria-locations');
        return saved ? JSON.parse(saved) : [];
    });
    const [history, setHistory] = useState<HistoryEntry[]>(() => {
        const saved = localStorage.getItem('sala-fria-history');
        return saved ? JSON.parse(saved) : [];
    });
    const [videos, setVideos] = useState<VideoCard[]>(() => {
        const saved = localStorage.getItem('sala-fria-videos');
        return saved ? JSON.parse(saved) : [];
    });
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('sala-fria-tasks');
        return saved ? JSON.parse(saved) : [];
    });
    const [hygieneTasks, setHygieneTasks] = useState<HygieneTask[]>(() => {
        const saved = localStorage.getItem('sala-fria-hygiene');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
        const saved = localStorage.getItem('sala-fria-offline-queue');
        return saved ? JSON.parse(saved) : [];
    });

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    // --- PWA Install Logic ---
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            addNotification('Instalação iniciada!', 'success');
        }
    };

    // --- Offline Logic ---
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addNotification('Conexão restabelecida! Sincronizando...', 'info');
        };
        const handleOffline = () => {
            setIsOnline(false);
            addNotification('Você está offline. Os ajustes serão salvos localmente.', 'info');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('sala-fria-offline-queue', JSON.stringify(offlineQueue));
        if (isOnline) {
            if (offlineQueue.length > 0) {
                syncOfflineData();
            } else {
                fetchData();
            }
        }
    }, [isOnline]); // Trigger sync or refresh only when entering online state

    // Ensure queue is pinned to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('sala-fria-offline-queue', JSON.stringify(offlineQueue));
    }, [offlineQueue]);

    const syncOfflineData = async () => {
        if (!isOnline || offlineQueue.length === 0) return;

        const queue = [...offlineQueue];
        setOfflineQueue([]); // Clear queue to prevent double sync

        setIsSyncing(true);

        for (const action of queue) {
            try {
                if (action.type === 'adjust') {
                    const { error } = await supabase.from('items').update({ value: action.newValue }).eq('id', action.itemId);
                    if (error) throw error;
                    await logHistory(action.itemId, action.itemName, action.adjustType, action.amount, action.previousValue, action.tempHistoryId, action.timestamp);
                } else if (action.type === 'create_item') {
                    const { data, error } = await supabase.from('items').insert([action.payload]).select();
                    if (error || !data) throw error;
                    await logHistory(data[0].id, data[0].name, 'create', data[0].value, undefined, action.tempHistoryId, action.timestamp);
                } else if (action.type === 'edit_item') {
                    const { error } = await supabase.from('items').update(action.payload).eq('id', action.itemId);
                    if (error) throw error;
                    await logHistory(action.itemId, action.payload.name, 'edit', 0, action.previousValue, action.tempHistoryId, action.timestamp);
                } else if (action.type === 'delete_item') {
                    const { error } = await supabase.from('items').delete().eq('id', action.itemId);
                    if (error) throw error;
                    await logHistory(action.itemId, action.itemName, 'delete', 0, action.previousValue, action.tempHistoryId, action.timestamp);
                } else if (action.type === 'create_category') {
                    const { error } = await supabase.from('categories').insert([action.payload]);
                    if (error) throw error;
                } else if (action.type === 'delete_category') {
                    const { error } = await supabase.from('categories').delete().eq('id', action.categoryId);
                    if (error) throw error;
                } else if (action.type === 'create_gramature') {
                    const { error } = await supabase.from('gramatures').insert([action.payload]);
                    if (error) throw error;
                } else if (action.type === 'delete_gramature') {
                    const { error } = await supabase.from('gramatures').delete().eq('id', action.gramatureId);
                    if (error) throw error;
                } else if (action.type === 'create_task') {
                    const { error } = await supabase.from('tasks').insert([action.payload]);
                    if (error) throw error;
                } else if (action.type === 'toggle_task') {
                    const { error } = await supabase.from('tasks').update({ completed: action.completed }).eq('id', action.taskId);
                    if (error) throw error;
                } else if (action.type === 'delete_task') {
                    const { error } = await supabase.from('tasks').delete().eq('id', action.taskId);
                    if (error) throw error;
                } else if (action.type === 'create_hygiene') {
                    const { error } = await supabase.from('hygiene_tasks').insert([action.payload]);
                    if (error) throw error;
                } else if (action.type === 'update_hygiene') {
                    const { error } = await supabase.from('hygiene_tasks').update(action.payload).eq('id', action.hygieneId);
                    if (error) throw error;
                } else if (action.type === 'delete_hygiene') {
                    const { error } = await supabase.from('hygiene_tasks').delete().eq('id', action.hygieneId);
                    if (error) throw error;
                }
            } catch (err) {
                console.error('Failed to sync action:', action, err);
            }
        }

        setIsSyncing(false);
        if (queue.length > 0) {
            addNotification(`Sincronização concluída! ${queue.length} registros atualizados.`, 'success');
            await fetchData();
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');
    const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'gramature' | 'video' | 'tasks' | 'copy' | 'hygiene' | 'reports'>('inventory');
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
        // Switch to inventory tab when entering fast mode
        if (appMode === 'fast') {
            setActiveTab('inventory');
        }
    }, [appMode]);

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isGramatureModalOpen, setIsGramatureModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
    const [cooldownItems, setCooldownItems] = useState<{ [key: string]: boolean }>({});
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
    const [adjustValue, setAdjustValue] = useState('');

    const [newItem, setNewItem] = useState({ name: '', category: '', unit: '', value: '', min_value: '', location: '' });
    const [newGramature, setNewGramature] = useState({ name: '', weight: '' });
    const [newCategory, setNewCategory] = useState('');
    const [newVideo, setNewVideo] = useState({ title: '', description: '', file: null as File | null });
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [logoutPassword, setLogoutPassword] = useState('');
    const [clearReportPassword, setClearReportPassword] = useState('');
    const [isClearReportModalOpen, setIsClearReportModalOpen] = useState(false);
    const [isExportFormatModalOpen, setIsExportFormatModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'excel' | 'word'>('excel');
    const [reportDayFilter, setReportDayFilter] = useState<number | null>(null);
    const [reportWeekdayFilter, setReportWeekdayFilter] = useState<number | null>(null);
    const [reportWeekFilter, setReportWeekFilter] = useState<number | null>(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    const [isHygieneModalOpen, setIsHygieneModalOpen] = useState(false);
    const [editingHygieneTask, setEditingHygieneTask] = useState<HygieneTask | null>(null);
    const [newHygieneTask, setNewHygieneTask] = useState({ title: '', frequency: 'daily' as 'daily' | 'weekly' | 'monthly' });

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

    const sortedGramatures = [...gramatures].sort((a, b) => a.name.localeCompare(b.name));
    const sortedAndFilteredItems = items
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLocation = !selectedLocation || item.location === selectedLocation;
            return matchesSearch && matchesLocation;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const sortedAndFilteredVideos = videos
        .filter(video => video.title.toLowerCase().includes(searchTerm.toLowerCase()) || (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase())))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // --- Fetch Data ---
    const fetchData = async () => {
        if (!session || !isOnline) return;
        setLoading(true);
        try {
            const [itemsRes, catsRes, gramRes, histRes, hygieneRes, videosRes, tasksRes, locsRes] = await Promise.all([
                supabase.from('items').select('*').order('name'),
                supabase.from('categories').select('*').order('name'),
                supabase.from('gramatures').select('*').order('name'),
                supabase.from('history').select('*').order('timestamp', { ascending: false }).limit(100),
                supabase.from('hygiene_tasks').select('*'),
                supabase.from('videos').select('*').order('created_at', { ascending: false }),
                supabase.from('tasks').select('*').order('created_at', { ascending: false }),
                supabase.from('locations').select('*').order('name')
            ]);

            if (itemsRes.data) {
                setItems(itemsRes.data);
                localStorage.setItem('sala-fria-items', JSON.stringify(itemsRes.data));
            }
            if (catsRes.data) {
                setCategories(catsRes.data);
                localStorage.setItem('sala-fria-categories', JSON.stringify(catsRes.data));
            }
            if (gramRes.data) {
                setGramatures(gramRes.data);
                localStorage.setItem('sala-fria-gramatures', JSON.stringify(gramRes.data));
            }
            if (histRes.data) {
                setHistory(prev => {
                    const pending = prev.filter(e => e.pending);
                    // Combina o que veio do servidor com o que ainda está pendente de sync local
                    const combined = [...pending, ...histRes.data];
                    // Remove duplicatas por ID e ordena por tempo
                    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 100);
                    localStorage.setItem('sala-fria-history', JSON.stringify(unique));
                    return unique;
                });
            }
            if (hygieneRes.data) {
                setHygieneTasks(hygieneRes.data);
                localStorage.setItem('sala-fria-hygiene', JSON.stringify(hygieneRes.data));
            }
            if (videosRes.data) {
                setVideos(videosRes.data);
                localStorage.setItem('sala-fria-videos', JSON.stringify(videosRes.data));
            }
            if (tasksRes.data) {
                setTasks(tasksRes.data);
                localStorage.setItem('sala-fria-tasks', JSON.stringify(tasksRes.data));
            }
            if (locsRes.data) {
                setLocations(locsRes.data);
                localStorage.setItem('sala-fria-locations', JSON.stringify(locsRes.data));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            addNotification('Erro ao carregar dados do banco.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSeedData = async () => {
        if (!isOnline) {
            addNotification('Você precisa estar online para gerar dados de exemplo.', 'error');
            return;
        }
        setLoading(true);
        try {
            const sampleCats = ['Carnes', 'Sobremesas', 'Limpeza', 'Bebidas'];
            await supabase.from('categories').insert(sampleCats.map(name => ({ name })));

            await supabase.from('gramatures').insert([
                { name: 'Caixa Pequena', weight: '5kg' },
                { name: 'Pacote Família', weight: '2kg' }
            ]);

            const sampleItems = [
                { name: 'Peito de Frango', category: 'Carnes', unit: 'Kilos', value: 15, min_value: 5, location: 'Palete 1' },
                { name: 'Sorvete de Baunilha', category: 'Sobremesas', unit: 'Unidades', value: 8, min_value: 10, location: 'Gaveta Freezer' },
                { name: 'Detergente', category: 'Limpeza', unit: 'Unidades', value: 24, min_value: 2, location: 'Prateleira A1' },
                { name: 'Refrigerante 2L', category: 'Bebidas', unit: 'Unidades', value: 12, location: 'Prateleira B2' }
            ];
            await supabase.from('items').insert(sampleItems.map(item => ({ ...item, user_id: session?.user.id })));

            addNotification('Dados de exemplo gerados com sucesso!', 'success');
            fetchData();
        } catch (err) {
            console.error(err);
            addNotification('Erro ao gerar dados de exemplo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
            setSearchTerm(''); // Limpar barra de pesquisa ao fazer login
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
                const { error } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });
                if (error) throw error;
                addNotification('Bem-vindo de volta!', 'success');
            } else {
                const { error } = await supabase.auth.signUp({ email: formattedEmail, password });
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
        if (!logoutPassword) {
            addNotification('Digite a senha para confirmar.', 'error');
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: session?.user?.email || '',
                password: logoutPassword
            });
            if (error) {
                addNotification('Senha incorreta.', 'error');
                setLogoutPassword('');
                return;
            }
            await supabase.auth.signOut();
            setItems([]);
            setCategories([]);
            setGramatures([]);
            setHistory([]);
            setIsLogoutModalOpen(false);
            setLogoutPassword('');
            addNotification('Sessão encerrada.', 'info');
        } catch (error: any) {
            addNotification('Erro ao deslogar.', 'error');
            setLogoutPassword('');
        }
    };

    const playFeedback = (type: 'success' | 'error' | 'info' | 'remove') => {
        if (window.navigator.vibrate) {
            if (type === 'error') window.navigator.vibrate([150, 50, 150, 50, 150]);
            else if (type === 'remove') window.navigator.vibrate([80, 50, 80]);
            else window.navigator.vibrate(70);
        }
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(660, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.8, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'remove') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.8, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'error') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(330, ctx.currentTime);
                gain.gain.setValueAtTime(0.7, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.6, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) {
            console.log('Audio feedback not supported or blocked');
        }
    };

    const addNotification = (message: string, type: Notification['type'] | 'remove' = 'success') => {
        const id = Date.now().toString();
        const visualType = type === 'remove' ? 'info' : type;
        setNotifications(prev => [...prev, { id, message, type: visualType as Notification['type'] }]);
        playFeedback(type);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const logHistory = async (itemId: string, itemName: string, type: HistoryEntry['type'], amount: number, previousValue?: number, tempIdToRemove?: string, forcedTimestamp?: string) => {
        const timestamp = forcedTimestamp || new Date().toISOString();
        const entry = {
            item_id: itemId,
            item_name: itemName,
            type,
            amount,
            previous_value: previousValue,
            timestamp: timestamp
        };

        const tempId = tempIdToRemove || 'temp-' + Date.now().toString() + Math.random().toString(36).substr(2, 5);

        if (!isOnline && !tempIdToRemove) {
            const localEntry = { ...entry, id: tempId, pending: true } as HistoryEntry;
            setHistory(prev => {
                const newHistory = [localEntry, ...prev.filter(e => e.id !== tempId)].slice(0, 100);
                localStorage.setItem('sala-fria-history', JSON.stringify(newHistory));
                return newHistory;
            });
            return { tempId, timestamp };
        }

        try {
            const { data, error } = await supabase.from('history').insert([{
                item_id: entry.item_id,
                item_name: entry.item_name,
                type: entry.type,
                amount: entry.amount,
                previous_value: entry.previous_value,
                timestamp: entry.timestamp
            }]).select();

            if (error) throw error;

            if (data) {
                setHistory(prev => {
                    const filtered = prev.filter(e => e.id !== tempId && e.id !== tempIdToRemove);
                    const newHistory = [data[0], ...filtered].slice(0, 100);
                    localStorage.setItem('sala-fria-history', JSON.stringify(newHistory));
                    return newHistory;
                });
            }
        } catch (error) {
            console.error('Error logging history:', error);
            if (!tempIdToRemove) {
                const localEntry = { ...entry, id: tempId, pending: true } as HistoryEntry;
                setHistory(prev => {
                    const newHistory = [localEntry, ...prev.filter(e => e.id !== tempId)].slice(0, 100);
                    localStorage.setItem('sala-fria-history', JSON.stringify(newHistory));
                    return newHistory;
                });
            }
        }
        return { tempId, timestamp };
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.category || !newItem.unit || !newItem.value) return;

        const itemPayload = {
            name: newItem.name,
            category: newItem.category,
            unit: newItem.unit,
            value: parseFloat(newItem.value),
            min_value: newItem.min_value ? parseFloat(newItem.min_value) : null,
            location: newItem.location || 'Outros'
        };

        if (editingItem) {
            setItems(items.map(item => item.id === editingItem.id ? { ...item, ...itemPayload } : item));

            if (!isOnline) {
                const { tempId, timestamp } = await logHistory(editingItem.id, newItem.name, 'edit', 0, editingItem.value);
                setOfflineQueue(prev => [...prev, {
                    type: 'edit_item',
                    itemId: editingItem.id,
                    payload: itemPayload,
                    previousValue: editingItem.value,
                    tempHistoryId: tempId,
                    timestamp: timestamp
                }]);
                addNotification(`Item "${newItem.name}" atualizado localmente.`);
            } else {
                const { error } = await supabase.from('items').update(itemPayload).eq('id', editingItem.id);
                if (error) {
                    addNotification('Erro ao atualizar item.', 'error');
                    return;
                }
                await logHistory(editingItem.id, newItem.name, 'edit', 0, editingItem.value);
                addNotification(`Item "${newItem.name}" atualizado com sucesso!`);
            }
            setEditingItem(null);
        } else {
            const newItemLocal = { ...itemPayload, id: 'temp-' + Date.now().toString() };
            setItems([...items, newItemLocal]);

            if (!isOnline) {
                const { tempId, timestamp } = await logHistory(newItemLocal.id, newItemLocal.name, 'create', newItemLocal.value);
                setOfflineQueue(prev => [...prev, {
                    type: 'create_item',
                    payload: itemPayload,
                    tempHistoryId: tempId,
                    timestamp: timestamp
                }]);
                addNotification(`Item "${newItem.name}" criado localmente.`);
            } else {
                const { data, error } = await supabase.from('items').insert([itemPayload]).select();
                if (error || !data) {
                    addNotification('Erro ao criar item.', 'error');
                    return;
                }
                // Update with real ID
                setItems(prev => prev.map(i => i.id === newItemLocal.id ? data[0] : i));
                await logHistory(data[0].id, data[0].name, 'create', data[0].value);
                addNotification(`Item "${data[0].name}" criado com sucesso!`);
            }
        }
        setNewItem({ name: '', category: '', unit: '', value: '', min_value: '', location: '' });
        setIsItemModalOpen(false);
    };

    const handleDeleteItem = async (id: string, name: string) => {
        const itemToDelete = items.find(i => i.id === id);
        if (confirm(`Excluir "${name}"?`)) {
            setItems(items.filter(item => item.id !== id));
            if (!isOnline) {
                const { tempId, timestamp } = await logHistory(id, name, 'delete', 0, itemToDelete?.value);
                setOfflineQueue(prev => [...prev, {
                    type: 'delete_item',
                    itemId: id,
                    itemName: name,
                    previousValue: itemToDelete?.value,
                    tempHistoryId: tempId,
                    timestamp: timestamp
                }]);
                addNotification(`Item "${name}" removido localmente.`, 'info');
            } else {
                const { error } = await supabase.from('items').delete().eq('id', id);
                if (error) {
                    addNotification('Erro ao excluir item.', 'error');
                    return;
                }
                await logHistory(id, name, 'delete', 0, itemToDelete?.value);
                addNotification(`Item "${name}" excluído.`, 'info');
            }
        }
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setNewItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            value: item.value.toString(),
            min_value: item.min_value !== undefined && item.min_value !== null ? item.min_value.toString() : '',
            location: item.location || ''
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
        const newValue = typeToUse === 'add' ? itemToAdjust.value + amount : Math.max(0, itemToAdjust.value - amount);
        setItems(prevItems => prevItems.map(item => item.id === itemToAdjust.id ? { ...item, value: newValue } : item));
        if (!isOnline) {
            const { tempId, timestamp } = await logHistory(itemToAdjust.id, itemToAdjust.name, typeToUse, amount, itemToAdjust.value);
            setOfflineQueue(prev => [...prev, {
                type: 'adjust', itemId: itemToAdjust.id, itemName: itemToAdjust.name,
                adjustType: typeToUse, amount: amount, newValue: newValue, previousValue: itemToAdjust.value,
                tempHistoryId: tempId,
                timestamp: timestamp
            }]);
            playFeedback('success');
            setIsAdjustModalOpen(false);
            setAdjustingItem(null);
            setAdjustValue('');
            return;
        }
        const { error } = await supabase.from('items').update({ value: newValue }).eq('id', itemToAdjust.id);
        if (error) {
            addNotification('Erro ao ajustar estoque.', 'error');
            return;
        }
        await logHistory(itemToAdjust.id, itemToAdjust.name, typeToUse, amount, itemToAdjust.value);
        addNotification(`${typeToUse === 'add' ? 'Adicionado' : 'Removido'} ${amount} ${itemToAdjust.unit} de "${itemToAdjust.name}".`, typeToUse === 'add' ? 'success' : 'remove');
        setIsAdjustModalOpen(false);
        setAdjustingItem(null);
        setAdjustValue('');
    };

    const handleAddGramature = async () => {
        if (!newGramature.name || !newGramature.weight) return;
        const entryToAdd = { name: newGramature.name, weight: newGramature.weight };
        const tempEntry = { ...entryToAdd, id: 'temp-' + Date.now().toString() } as Gramature;
        setGramatures([...gramatures, tempEntry]);
        if (!isOnline) {
            setOfflineQueue(prev => [...prev, { type: 'create_gramature', payload: entryToAdd }]);
            addNotification('Gramatura salva localmente.');
        } else {
            const { data, error } = await supabase.from('gramatures').insert([entryToAdd]).select();
            if (error || !data) {
                addNotification('Erro ao salvar gramatura.', 'error');
                return;
            }
            setGramatures(prev => prev.map(g => g.id === tempEntry.id ? data[0] : g));
            addNotification('Gramatura salva com sucesso!');
        }
        setNewGramature({ name: '', weight: '' });
        setIsGramatureModalOpen(false);
    };

    const handleDeleteGramature = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a gramatura de "${name}"?`)) {
            setGramatures(gramatures.filter(g => g.id !== id));
            if (!isOnline) {
                setOfflineQueue(prev => [...prev, { type: 'delete_gramature', gramatureId: id }]);
                addNotification('Gramatura removida localmente.', 'info');
            } else {
                const { error } = await supabase.from('gramatures').delete().eq('id', id);
                if (error) {
                    addNotification('Erro ao excluir gramatura.', 'error');
                    return;
                }
                addNotification('Gramatura removida.', 'info');
            }
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory) return;
        const catPayload = { name: newCategory };
        const tempCat = { ...catPayload, id: 'temp-' + Date.now().toString() } as Category;
        setCategories([...categories, tempCat]);
        if (!isOnline) {
            setOfflineQueue(prev => [...prev, { type: 'create_category', payload: catPayload }]);
            addNotification('Categoria salva localmente.');
        } else {
            const { data, error } = await supabase.from('categories').insert([catPayload]).select();
            if (error || !data) {
                addNotification('Erro ao adicionar categoria.', 'error');
                return;
            }
            setCategories(prev => prev.map(c => c.id === tempCat.id ? data[0] : c));
        }
        setNewCategory('');
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm('Excluir esta categoria?')) {
            setCategories(categories.filter(x => x.id !== id));
            if (!isOnline) {
                setOfflineQueue(prev => [...prev, { type: 'delete_category', categoryId: id }]);
                addNotification('Categoria removida localmente.');
            } else {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) {
                    addNotification('Erro ao excluir categoria.', 'error');
                    return;
                }
            }
        }
    };

    const handleAddLocation = async () => {
        if (!newLocationName.trim()) return;
        const locationPayload = { name: newLocationName.trim(), user_id: session?.user.id };
        const tempId = 'temp-' + Date.now();
        const newLocationLocal = { ...locationPayload, id: tempId };

        setLocations(prev => [...prev, newLocationLocal as Location]);
        setNewLocationName('');

        if (!isOnline) {
            setOfflineQueue(prev => [...prev, { type: 'create_location', payload: locationPayload }]);
            addNotification('Localização adicionada localmente.');
        } else {
            const { data, error } = await supabase.from('locations').insert([locationPayload]).select();
            if (error || !data) {
                addNotification('Erro ao adicionar localização.', 'error');
                return;
            }
            setLocations(prev => prev.map(l => l.id === tempId ? data[0] : l));
            addNotification('Localização adicionada com sucesso!');
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta localização?')) {
            setLocations(locations.filter(l => l.id !== id));
            if (!isOnline) {
                setOfflineQueue(prev => [...prev, { type: 'delete_location', locationId: id }]);
                addNotification('Localização removida localmente.');
            } else {
                const { error } = await supabase.from('locations').delete().eq('id', id);
                if (error) {
                    addNotification('Erro ao excluir localização.', 'error');
                }
            }
        }
    };

    const handleClearHistory = async () => {
        setIsClearReportModalOpen(true);
    };

    const confirmClearReport = async () => {
        if (!clearReportPassword) return;
        setLoading(true);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: session?.user?.email || '',
                password: clearReportPassword
            });
            if (authError) {
                addNotification('Senha incorreta.', 'error');
                setClearReportPassword('');
                return;
            }
            const { error: dbError } = await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (dbError) {
                addNotification('Erro ao limpar histórico.', 'error');
                return;
            }
            setHistory([]);
            localStorage.setItem('sala-fria-history', JSON.stringify([]));
            setIsClearReportModalOpen(false);
            setClearReportPassword('');
            addNotification('Relatório e histórico zerados com sucesso.', 'info');
        } catch (error: any) {
            addNotification('Erro ao processar solicitação.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddVideo = async () => {
        if (!newVideo.title || !newVideo.file) {
            addNotification('Por favor, preencha o título e selecione um vídeo.', 'error');
            return;
        }
        setUploadingVideo(true);
        try {
            const fileExt = newVideo.file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `videos/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, newVideo.file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath);
            const videoPayload = { title: newVideo.title, description: newVideo.description, video_url: publicUrl };
            const { data, error } = await supabase.from('videos').insert([videoPayload]).select();
            if (error) throw error;
            if (data) {
                setVideos(prev => [data[0], ...prev]);
                addNotification('Vídeo enviado com sucesso!');
            }
            setIsVideoModalOpen(false);
            setNewVideo({ title: '', description: '', file: null });
        } catch (error: any) {
            addNotification(`Erro ao enviar vídeo: ${error.message}`, 'error');
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleDeleteVideo = async (id: string, videoUrl: string) => {
        if (confirm('Deseja realmente excluir este vídeo?')) {
            try {
                const { error: dbError } = await supabase.from('videos').delete().eq('id', id);
                if (dbError) throw dbError;
                const pathParts = videoUrl.split('/videos/');
                if (pathParts.length > 1) {
                    const filePath = `videos/${pathParts[1]}`;
                    await supabase.storage.from('videos').remove([filePath]);
                }
                setVideos(prev => prev.filter(v => v.id !== id));
                addNotification('Vídeo removido com sucesso!');
            } catch (error: any) {
                addNotification('Erro ao excluir vídeo.', 'error');
            }
        }
    };

    const handleAddTask = async () => {
        if (!newTask.title) return;
        const taskPayload = { title: newTask.title, description: newTask.description, completed: false };
        if (!isOnline) {
            const tempTask = { ...taskPayload, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Task;
            setTasks(prev => [tempTask, ...prev]);
            setOfflineQueue(prev => [...prev, { type: 'create_task', payload: taskPayload }]);
            addNotification('Tarefa salva localmente.');
        } else {
            const { data, error } = await supabase.from('tasks').insert([taskPayload]).select();
            if (error) {
                addNotification('Erro ao criar tarefa.', 'error');
                return;
            }
            if (data) setTasks(prev => [data[0], ...prev]);
            addNotification('Tarefa criada com sucesso!');
        }
        setNewTask({ title: '', description: '' });
        setIsTaskModalOpen(false);
    };

    const handleToggleTask = async (id: string, completed: boolean) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
        if (!isOnline) {
            setOfflineQueue(prev => [...prev, { type: 'toggle_task', taskId: id, completed: !completed }]);
        } else {
            const { error } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
            if (error) addNotification('Erro ao atualizar tarefa.', 'error');
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (confirm('Excluir esta tarefa?')) {
            setTasks(prev => prev.filter(t => t.id !== id));
            if (!isOnline) {
                setOfflineQueue(prev => [...prev, { type: 'delete_task', taskId: id }]);
            } else {
                const { error } = await supabase.from('tasks').delete().eq('id', id);
                if (error) addNotification('Erro ao remover tarefa.', 'error');
            }
        }
    };

    const handleToggleHygieneTask = async (id: string) => {
        const task = hygieneTasks.find(t => t.id === id);
        if (!task) return;

        const newCompleted = !task.completed;
        const lastCompleted = newCompleted ? new Date().toISOString() : task.last_completed;

        setHygieneTasks(prev => {
            const updated = prev.map(t => t.id === id ? { ...t, completed: newCompleted, last_completed: lastCompleted } : t);
            localStorage.setItem('sala-fria-hygiene', JSON.stringify(updated));
            return updated;
        });

        if (!isOnline) {
            setOfflineQueue(prev => [...prev, { type: 'update_hygiene', hygieneId: id, payload: { completed: newCompleted, last_completed: lastCompleted } }]);
        } else {
            const { error } = await supabase.from('hygiene_tasks').update({ completed: newCompleted, last_completed: lastCompleted }).eq('id', id);
            if (error) addNotification('Erro ao salvar no banco.', 'error');
        }
        addNotification('Checklist registrado!', 'success');
    };

    const handleSeedHygiene = async () => {
        const seedData: Omit<HygieneTask, 'id'>[] = [
            { title: 'Higienização das mãos (Entrada/Troca)', frequency: 'daily', completed: false },
            { title: 'Limpeza de superfícies e utensílios', frequency: 'daily', completed: false },
            { title: 'Limpeza de pisos e ralos', frequency: 'daily', completed: false },
            { title: 'Retira de resíduos (Lixos)', frequency: 'daily', completed: false },
            { title: 'Controle de temperatura (Freezers)', frequency: 'daily', completed: false },
            { title: 'Limpeza de paredes e janelas', frequency: 'weekly', completed: false },
            { title: 'Limpeza interna de freezers', frequency: 'weekly', completed: false },
            { title: 'Organização e limpeza de estoque', frequency: 'weekly', completed: false },
            { title: 'Controle integrado de pragas', frequency: 'monthly', completed: false },
            { title: 'Higienização de ar-condicionado/filtros', frequency: 'monthly', completed: false }
        ];

        if (isOnline) {
            const { data, error } = await supabase.from('hygiene_tasks').insert(seedData.map(item => ({ ...item, user_id: session?.user.id }))).select();
            if (error) {
                addNotification('Erro ao gerar sementes.', 'error');
                return;
            }
            if (data) setHygieneTasks(data);
        } else {
            // Se offline, gera IDs locais
            const localSeeds: HygieneTask[] = seedData.map((s, i) => ({ ...s, id: 'temp-' + i + Date.now() }));
            setHygieneTasks(localSeeds);
            addNotification('Gerado localmente. Sincronize ao voltar online.', 'info');
        }
        addNotification('Checklist ANVISA gerado!', 'success');
    };

    const handleResetHygiene = async () => {
        if (confirm('Deseja resetar todo o checklist de higiene?')) {
            setHygieneTasks(prev => {
                const updated = prev.map(t => ({ ...t, completed: false }));
                localStorage.setItem('sala-fria-hygiene', JSON.stringify(updated));
                return updated;
            });

            if (isOnline) {
                const { error } = await supabase.from('hygiene_tasks').update({ completed: false }).neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
                if (error) addNotification('Erro ao resetar no banco.', 'error');
            }
            addNotification('Checklist resetado.', 'info');
        }
    };

    const handleAddHygieneTask = async () => {
        if (!newHygieneTask.title) return;

        if (editingHygieneTask) {
            const updatedPayload = { title: newHygieneTask.title, frequency: newHygieneTask.frequency };
            setHygieneTasks(prev => {
                const updated = prev.map(t => t.id === editingHygieneTask.id ? { ...t, ...updatedPayload } : t);
                localStorage.setItem('sala-fria-hygiene', JSON.stringify(updated));
                return updated;
            });

            if (isOnline) {
                await supabase.from('hygiene_tasks').update(updatedPayload).eq('id', editingHygieneTask.id);
            } else {
                setOfflineQueue(prev => [...prev, { type: 'update_hygiene', hygieneId: editingHygieneTask.id, payload: updatedPayload }]);
            }
            addNotification('Tarefa atualizada!');
            setEditingHygieneTask(null);
        } else {
            const newItemPayload = {
                title: newHygieneTask.title,
                frequency: newHygieneTask.frequency,
                completed: false,
                user_id: session?.user.id
            };

            if (isOnline) {
                const { data, error } = await supabase.from('hygiene_tasks').insert([newItemPayload]).select();
                if (data) setHygieneTasks(prev => [...prev, data[0]]);
            } else {
                const tempId = 'hy-' + Date.now();
                const tempTask = { ...newItemPayload, id: tempId } as HygieneTask;
                setHygieneTasks(prev => [...prev, tempTask]);
                setOfflineQueue(prev => [...prev, { type: 'create_hygiene', payload: newItemPayload }]);
            }
            addNotification('Tarefa adicionada!');
        }
        setNewHygieneTask({ title: '', frequency: 'daily' });
        setIsHygieneModalOpen(false);
    };

    const handleDeleteHygieneTask = async (id: string) => {
        if (confirm('Excluir esta tarefa de higiene?')) {
            setHygieneTasks(prev => {
                const updated = prev.filter(t => t.id !== id);
                localStorage.setItem('sala-fria-hygiene', JSON.stringify(updated));
                return updated;
            });

            if (isOnline) {
                await supabase.from('hygiene_tasks').delete().eq('id', id);
            } else {
                setOfflineQueue(prev => [...prev, { type: 'delete_hygiene', hygieneId: id }]);
            }
            addNotification('Tarefa removida.', 'info');
        }
    };

    const handleEditHygieneTask = (task: HygieneTask) => {
        setEditingHygieneTask(task);
        setNewHygieneTask({ title: task.title, frequency: task.frequency });
        setIsHygieneModalOpen(true);
    };

    const handleShareShoppingList = () => {
        if (items.length === 0) {
            addNotification('Nenhum item no estoque para copiar.', 'info');
            return;
        }

        let message = "*ESTOQUE GERAL*\n\n";

        const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

        sortedItems.forEach(item => {
            message += `*${item.name}*: ${item.value} ${item.unit}\n`;
        });

        navigator.clipboard.writeText(message).then(() => {
            addNotification('✅ Lista copiada!');
        }).catch(() => {
            addNotification('Erro ao copiar lista.', 'error');
        });
    };

    const handleExportToExcel = () => {
        if (items.length === 0) return;
        setExportType('excel');
        setIsExportFormatModalOpen(true);
    };

    const handleExportToWord = () => {
        if (items.length === 0) return;
        setExportType('word');
        setIsExportFormatModalOpen(true);
    };

    const downloadFile = (blob: Blob, name: string) => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", name);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const performExport = (format: 'xls' | 'csv' | 'doc' | 'google' | 'clipboard') => {
        setIsExportFormatModalOpen(false);
        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
        const filename = `Estoque_Sala_Fria_${dateStr}`;

        if (format === 'csv') {
            let csv = "\uFEFFItem;Categoria;Quantidade;Unidade;Mínimo\n";
            [...items].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                csv += `${item.name};${item.category};${item.value};${item.unit};${item.min_value || '-'}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            downloadFile(blob, `${filename}.csv`);
        } else if (format === 'google') {
            let csv = "\uFEFFItem,Categoria,Quantidade,Unidade,Mínimo\n";
            [...items].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                csv += `${item.name},${item.category},${item.value},${item.unit},${item.min_value || '-'}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            downloadFile(blob, `${filename}_Google.csv`);
        } else if (format === 'clipboard') {
            let csv = "Item\tCategoria\tQuantidade\tUnidade\tMínimo\n";
            [...items].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                csv += `${item.name}\t${item.category}\t${item.value}\t${item.unit}\t${item.min_value || '-'}\n`;
            });
            navigator.clipboard.writeText(csv).then(() => {
                addNotification('📋 Dados copiados no formato de planilha!');
            }).catch(() => {
                addNotification('Erro ao copiar dados.', 'error');
            });
            return;
        } else if (format === 'xls') {
            const header = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Estoque">
  <Table>
   <Column ss:Width="250"/>
   <Column ss:Width="150"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Row>
    <Cell><Data ss:Type="String">Item</Data></Cell>
    <Cell><Data ss:Type="String">Categoria</Data></Cell>
    <Cell><Data ss:Type="String">Quantidade</Data></Cell>
    <Cell><Data ss:Type="String">Unidade</Data></Cell>
    <Cell><Data ss:Type="String">Mínimo</Data></Cell>
   </Row>`;

            const rows = [...items].sort((a, b) => a.name.localeCompare(b.name)).map(item => `
   <Row>
    <Cell><Data ss:Type="String">${item.name}</Data></Cell>
    <Cell><Data ss:Type="String">${item.category}</Data></Cell>
    <Cell><Data ss:Type="Number">${item.value}</Data></Cell>
    <Cell><Data ss:Type="String">${item.unit}</Data></Cell>
    <Cell><Data ss:Type="String">${item.min_value || '-'}</Data></Cell>
   </Row>`).join('');

            const footer = `
  </Table>
 </Worksheet>
</Workbook>`;
            const blob = new Blob([header + rows + footer], { type: 'application/vnd.ms-excel' });
            downloadFile(blob, `${filename}.xls`);
        } else if (format === 'doc') {
            const date = new Date().toLocaleDateString('pt-BR');
            let docHtml = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Estoque</title>
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { text-align: center; font-family: Arial, sans-serif; }
                </style>
                </head>
                <body>
                    <h1>Relatório de Estoque - ${date}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Categoria</th>
                                <th>Quantidade</th>
                                <th>Unidade</th>
                                <th>Mínimo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[...items].sort((a, b) => a.name.localeCompare(b.name)).map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.category}</td>
                                    <td>${item.value}</td>
                                    <td>${item.unit}</td>
                                    <td>${item.min_value || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            const blob = new Blob([docHtml], { type: 'application/msword' });
            downloadFile(blob, `${filename}.doc`);
        }
        const label = format === 'google' ? 'Google Sheets' : format.toUpperCase();
        addNotification(`Arquivo ${label} gerado com sucesso!`);
    };


    const getReportsData = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        let filteredHistory = history.filter(h => {
            const ts = new Date(h.timestamp);
            return ts >= startOfMonth && ts <= endOfMonth;
        });

        // Apply Week filter (Calendar weeks)
        if (reportWeekFilter !== null) {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // Sunday=0
            filteredHistory = filteredHistory.filter(h => {
                const ts = new Date(h.timestamp);
                const weekNum = Math.ceil((ts.getDate() + firstDayOfMonth) / 7);
                return weekNum === reportWeekFilter;
            });
        }

        // Apply other filters
        if (reportDayFilter !== null) {
            filteredHistory = filteredHistory.filter(h => new Date(h.timestamp).getDate() === reportDayFilter);
        }
        if (reportWeekdayFilter !== null) {
            filteredHistory = filteredHistory.filter(h => new Date(h.timestamp).getDay() === reportWeekdayFilter);
        }

        const itemStats: { [key: string]: { name: string, entries: number, exits: number, dates: Set<string> } } = {};
        const dailyVolume: { [key: string]: number } = {};

        filteredHistory.forEach(h => {
            const dateStr = new Date(h.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!itemStats[h.item_name]) {
                itemStats[h.item_name] = { name: h.item_name, entries: 0, exits: 0, dates: new Set() };
            }
            if (h.type === 'add' || h.type === 'create') {
                itemStats[h.item_name].entries += h.amount;
            } else if (h.type === 'remove' || h.type === 'delete') {
                itemStats[h.item_name].exits += h.amount;
            }
            itemStats[h.item_name].dates.add(dateStr);

            const day = new Date(h.timestamp).toLocaleDateString('pt-BR');
            dailyVolume[day] = (dailyVolume[day] || 0) + Math.abs(h.amount);
        });

        const sortedItems = Object.values(itemStats)
            .sort((a, b) => (b.entries + b.exits) - (a.entries + a.exits))
            .map(item => ({ ...item, dates: Array.from(item.dates).sort().reverse() }));
        const sortedDays = Object.entries(dailyVolume).sort((a, b) => b[1] - (a[1] as number)).slice(0, 5) as [string, number][];

        return { sortedItems, sortedDays, totalActions: filteredHistory.length };
    };

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
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {isSyncing && (
                    <div className="glass-card animate-in" style={{
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '20px',
                        boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                    }}>
                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sincronizando...</span>
                    </div>
                )}
                {notifications.map(n => (
                    <div key={n.id} className="glass-card animate-in" style={{
                        padding: '12px 16px',
                        minWidth: '250px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        borderLeft: `4px solid ${n.type === 'success' ? 'var(--success)' : n.type === 'error' ? 'var(--danger)' : 'var(--accent-primary)'}`
                    }}>
                        {n.type === 'success' ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <AlertCircle size={18} style={{ color: 'var(--accent-primary)' }} />}
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{n.message}</span>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            {(activeTab === 'inventory' || activeTab === 'video') && (
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder={activeTab === 'inventory' ? "Buscar no estoque..." : "Buscar vídeos..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%', padding: '12px 12px 12px 40px' }}
                    />
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                {/* Nav & Toggle */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className={activeTab === 'inventory' ? 'primary' : 'secondary'}
                        style={{
                            padding: '10px',
                            marginBottom: '-4px', // Pulls name below closer if it existed, but here helps layout
                            ...(activeTab === 'inventory' && (
                                appMode === 'fast' ? {
                                    background: 'var(--accent-secondary)',
                                    border: '1px solid var(--accent-secondary)',
                                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
                                } : {
                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                    border: '1px solid #10b981',
                                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                                }
                            ))
                        }}
                        onClick={() => setActiveTab('inventory')}
                        title="Inventário"
                    >
                        <Package size={20} />
                    </button>

                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--card-border)' }}>
                        <button
                            onClick={() => setAppMode('fast')}
                            title="Modo Rápido"
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: appMode === 'fast' ? 'var(--accent-secondary)' : 'transparent',
                                color: appMode === 'fast' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <Zap size={18} />
                        </button>
                        <button
                            onClick={() => setAppMode('complete')}
                            title="Modo Completo"
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: appMode === 'complete' ? 'var(--accent-primary)' : 'transparent',
                                color: appMode === 'complete' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Multiplier Selector (Fast Mode Only) */}
                {appMode === 'fast' && (
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--accent-secondary)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)' }}>
                        {[1, 5, 10].map(amt => (
                            <button
                                key={amt}
                                onClick={() => setFastAmount(amt)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    background: fastAmount === amt ? 'var(--accent-secondary)' : 'transparent',
                                    color: fastAmount === amt ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    minWidth: '40px'
                                }}
                            >
                                x{amt}
                            </button>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {appMode === 'complete' && (
                        <button
                            className="primary"
                            style={{
                                padding: '10px',
                                background: 'linear-gradient(135deg, #10b981, #34d399)',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                            }}
                            onClick={() => { setEditingItem(null); setNewItem({ name: '', category: '', unit: '', value: '', min_value: '', location: '' }); setIsItemModalOpen(true); }}
                            title="Novo Item"
                        >
                            <Plus size={20} />
                        </button>
                    )}

                    {/* Hamburger Menu Button (at the other side) */}
                    <button
                        className="secondary"
                        style={{ padding: '10px' }}
                        onClick={() => setIsSidebarOpen(true)}
                        title="Menu"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </div>


            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <main className="animate-in">
                    {/* Visual Map / Shelves Section */}
                    {locations.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
                                <h3 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Mapa da Sala Fria</h3>
                            </div>
                            <div className="horizontal-scroll" style={{ flex: 1, padding: '2px 0' }}>
                                <div
                                    className={`shelf-card ${selectedLocation === null ? 'active' : ''}`}
                                    onClick={() => setSelectedLocation(null)}
                                    style={{ flex: '0 0 65px' }}
                                >
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>Todos</div>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{items.length} itens</div>
                                </div>
                                {locations.map((loc: Location) => {
                                    const count = items.filter(i => i.location === loc.name).length;
                                    return (
                                        <div
                                            key={loc.id}
                                            className={`shelf-card ${selectedLocation === loc.name ? 'active' : ''}`}
                                            onClick={() => setSelectedLocation(loc.name)}
                                            style={{ flex: '0 0 65px' }}
                                        >
                                            <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>{loc.name}</div>
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{count} itens</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Low Stock Summary text - Discreet version */}
                    {items.filter(i => i.min_value != null && i.value < (i.min_value || 0)).length > 0 && (
                        <div style={{ marginBottom: '12px', paddingLeft: '4px' }}>
                            <span style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>
                                Baixo: {
                                    items.filter(i => i.min_value != null && i.value < (i.min_value || 0))
                                        .map(i => i.name).join(', ')
                                }
                            </span>
                        </div>
                    )}

                    <div className="items-grid">
                        {sortedAndFilteredItems.length === 0 && !loading ? (
                            <div className="glass-card animate-in" style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                    <Package size={40} style={{ color: 'var(--accent-primary)' }} />
                                </div>
                                <div style={{ maxWidth: '400px' }}>
                                    <h2 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>{searchTerm ? 'Nenhum item encontrado' : 'Estoque Vazio'}</h2>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                        {searchTerm
                                            ? `Não encontramos nada para "${searchTerm}". Tente outro termo ou limpe a busca.`
                                            : 'Ainda não há itens cadastrados. Comece adicionando seus produtos ou gere dados de exemplo para ver como o app funciona.'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <button className="primary" onClick={() => { setEditingItem(null); setNewItem({ name: '', category: '', unit: '', value: '', min_value: '', location: '' }); setIsItemModalOpen(true); }}>
                                        <Plus size={18} /> Cadastrar Primeiro Item
                                    </button>
                                    {!searchTerm && (
                                        <button className="secondary" onClick={handleSeedData}>
                                            <Zap size={18} style={{ color: 'var(--accent-secondary)' }} /> Gerar Exemplos
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            sortedAndFilteredItems.map(item => {
                                const isLowStock = item.min_value && item.value < item.min_value;
                                return (
                                    <div
                                        key={item.id}
                                        className="glass-card item-card animate-in"
                                        style={{
                                            borderColor: isLowStock ? 'var(--danger)' : 'var(--card-border)',
                                            borderWidth: isLowStock ? '2px' : '1px',
                                            boxShadow: isLowStock ? '0 0 15px rgba(239, 68, 68, 0.2)' : ''
                                        }}
                                    >
                                        <div className="item-header" style={{ display: 'block' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span className="item-category">{item.category}</span>
                                                    <span className="item-category" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-secondary)' }}>{item.unit}</span>
                                                    {item.location && (
                                                        <span className="item-category" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Layers size={10} /> {item.location}
                                                        </span>
                                                    )}
                                                </div>
                                                {appMode === 'complete' && (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button className="secondary" style={{ padding: '6px' }} onClick={() => handleEditItem(item)} title="Editar Item"><Edit2 size={12} /></button>
                                                        <button className="danger" style={{ padding: '6px' }} onClick={() => handleDeleteItem(item.id, item.name)} title="Excluir Item"><Trash2 size={12} /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <p className="item-name" style={{ margin: 0 }}>{item.name}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="item-value" style={{
                                                        color: item.min_value && item.value < item.min_value ? 'var(--danger)' : 'var(--text-primary)'
                                                    }}>
                                                        {item.value.toLocaleString('pt-BR')}
                                                    </div>
                                                    {item.min_value && item.value < item.min_value && (
                                                        <div title={`Estoque Baixo! Mínimo: ${item.min_value}`} style={{ color: 'var(--danger)', animation: 'pulse 2s infinite' }}>
                                                            <AlertCircle size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                {item.min_value && (
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                        Mín: {item.min_value} {item.unit}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="item-actions" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '12px' }}>
                                            <button
                                                className="secondary"
                                                disabled={!!cooldownItems[item.id]}
                                                style={{
                                                    flex: 1,
                                                    justifyContent: 'center',
                                                    opacity: cooldownItems[item.id] ? 0.5 : 1,
                                                    cursor: cooldownItems[item.id] ? 'not-allowed' : 'pointer',
                                                    ...(appMode === 'fast' && {
                                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
                                                    })
                                                }}
                                                onClick={() => {
                                                    if (cooldownItems[item.id]) return;
                                                    setCooldownItems(prev => ({ ...prev, [item.id]: true }));
                                                    setTimeout(() => {
                                                        setCooldownItems(prev => ({ ...prev, [item.id]: false }));
                                                    }, 1000);

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
                                                disabled={!!cooldownItems[item.id]}
                                                style={{
                                                    flex: 1,
                                                    justifyContent: 'center',
                                                    opacity: cooldownItems[item.id] ? 0.5 : 1,
                                                    cursor: cooldownItems[item.id] ? 'not-allowed' : 'pointer',
                                                    background: appMode === 'fast'
                                                        ? 'linear-gradient(135deg, var(--accent-secondary), #a78bfa)'
                                                        : 'linear-gradient(135deg, #10b981, #34d399)',
                                                    boxShadow: appMode === 'fast'
                                                        ? '0 4px 15px rgba(139, 92, 246, 0.4)'
                                                        : '0 4px 15px rgba(16, 185, 129, 0.4)'
                                                }}
                                                onClick={() => {
                                                    if (cooldownItems[item.id]) return;
                                                    setCooldownItems(prev => ({ ...prev, [item.id]: true }));
                                                    setTimeout(() => {
                                                        setCooldownItems(prev => ({ ...prev, [item.id]: false }));
                                                    }, 1000);

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
                                );
                            })
                        )}
                    </div>
                </main>
            )}

            {/* GRAMATURE TAB */}
            {activeTab === 'gramature' && (
                <main className="animate-in">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Tabela de Gramaturas</h2>
                            <button className="primary" style={{ padding: '10px' }} onClick={() => setIsGramatureModalOpen(true)} title="Nova Gramatura">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '24px' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Histórico</h2>
                            {history.length > 0 && (
                                <button className="danger" onClick={handleClearHistory} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                                    <Trash2 size={16} style={{ marginRight: '6px' }} /> Limpar
                                </button>
                            )}
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.length === 0 && !loading ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Sem movimentações registradas.</p>
                            ) : (
                                history.map((entry: HistoryEntry) => (
                                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: entry.type === 'add' ? 'rgba(16,185,129,0.1)' : entry.type === 'remove' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: entry.type === 'add' ? 'var(--success)' : entry.type === 'remove' ? 'var(--danger)' : 'var(--accent-primary)', position: 'relative' }}>
                                            {entry.type === 'add' ? <Plus size={18} /> : entry.type === 'remove' ? <Minus size={18} /> : <Calendar size={18} />}
                                            {entry.pending && (
                                                <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-primary)', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px var(--accent-primary)' }}>
                                                    <Loader2 size={10} className="animate-spin" color="white" />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <p style={{ fontWeight: 600 }}>{entry.item_name}</p>
                                                {entry.pending && (
                                                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.2)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Offline</span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {entry.type === 'add' ? 'Adicionado' : entry.type === 'remove' ? 'Removido' : entry.type === 'create' ? 'Criado' : entry.type === 'delete' ? 'Excluído' : 'Editado'}
                                            </p>
                                        </div>

                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                {entry.previous_value !== undefined && entry.previous_value !== null && (
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

            {/* VIDEO TAB */}
            {activeTab === 'video' && (
                <main className="animate-in">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2>Vídeos e Monitoramento</h2>
                            <button className="primary" style={{ padding: '10px' }} onClick={() => setIsVideoModalOpen(true)} title="Adicionar Vídeo">
                                <Plus size={20} /> Adicionar
                            </button>
                        </div>

                        {sortedAndFilteredVideos.length === 0 && !loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed var(--card-border)', borderRadius: '20px' }}>
                                <Video size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {searchTerm ? 'Nenhum vídeo encontrado para esta busca.' : 'Nenhum vídeo enviado ainda.'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {sortedAndFilteredVideos.map(v => (
                                    <div key={v.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
                                            <video
                                                src={v.video_url}
                                                controls
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <h3 style={{ fontSize: '1.1rem' }}>{v.title}</h3>
                                                <button className="danger" style={{ padding: '6px' }} onClick={() => handleDeleteVideo(v.id, v.video_url)}><Trash2 size={14} /></button>
                                            </div>
                                            {v.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{v.description}</p>}
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '12px', opacity: 0.6 }}>
                                                {new Date(v.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
                <main className="animate-in">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ClipboardList size={28} style={{ color: 'var(--accent-primary)' }} />
                                <h2>Lista de Tarefas</h2>
                            </div>
                            <button className="primary" style={{ padding: '10px' }} onClick={() => setIsTaskModalOpen(true)} title="Nova Tarefa">
                                <Plus size={20} /> Adicionar
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {tasks.length === 0 && !loading ? (
                                <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed var(--card-border)', borderRadius: '20px' }}>
                                    <CheckSquare size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                                    <p style={{ color: 'var(--text-secondary)' }}>Nenhuma tarefa pendente. Tudo em ordem!</p>
                                </div>
                            ) : (
                                tasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="glass-card"
                                        style={{
                                            padding: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            opacity: t.completed ? 0.6 : 1,
                                            transition: 'all 0.3s',
                                            borderLeft: t.completed ? '4px solid var(--success)' : '4px solid var(--accent-primary)'
                                        }}
                                    >
                                        <button
                                            onClick={() => handleToggleTask(t.id, t.completed)}
                                            style={{
                                                background: 'transparent',
                                                color: t.completed ? 'var(--success)' : 'var(--text-secondary)',
                                                padding: '4px'
                                            }}
                                        >
                                            {t.completed ? <CheckCircle2 size={24} /> : <div style={{ width: '22px', height: '22px', border: '2px solid var(--card-border)', borderRadius: '6px' }} />}
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.1rem', textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{t.title}</h3>
                                            {t.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.description}</p>}
                                        </div>
                                        <button className="danger" style={{ padding: '8px' }} onClick={() => handleDeleteTask(t.id)} title="Excluir Tarefa">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            )}

            {/* HYGIENE TAB */}
            {
                activeTab === 'hygiene' && (
                    <main className="animate-in">
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <ShieldCheck size={28} style={{ color: 'var(--success)' }} />
                                    <div>
                                        <h2>Higiene Profissional</h2>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Padrão ANVISA - Controle de Sanitização</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="primary" onClick={() => { setEditingHygieneTask(null); setNewHygieneTask({ title: '', frequency: 'daily' }); setIsHygieneModalOpen(true); }} style={{ fontSize: '0.85rem' }}>
                                        <Plus size={16} /> Novo
                                    </button>
                                    {hygieneTasks.length === 0 && (
                                        <button className="secondary" onClick={handleSeedHygiene} style={{ fontSize: '0.85rem' }}>
                                            <Droplets size={16} /> Seed
                                        </button>
                                    )}
                                    {hygieneTasks.length > 0 && (
                                        <button className="danger" onClick={handleResetHygiene} style={{ fontSize: '0.85rem' }}>
                                            <Minus size={16} /> Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {hygieneTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed var(--card-border)' }}>
                                    <Droplets size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                                    <h3>Nenhum Checklist Ativo</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Inicie o padrão ANVISA para sua unidade.</p>
                                    <button className="primary" onClick={handleSeedHygiene}>Criar Agora</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {['daily', 'weekly', 'monthly'].map(freq => {
                                        const tasks = hygieneTasks.filter(t => t.frequency === freq);
                                        if (tasks.length === 0) return null;

                                        const title = freq === 'daily' ? 'Rotina Diária' : freq === 'weekly' ? 'Controle Semanal' : 'Controle Mensal';
                                        const color = freq === 'daily' ? 'var(--accent-primary)' : freq === 'weekly' ? '#A855F7' : '#EC4899';

                                        return (
                                            <div key={freq}>
                                                <h3 style={{ fontSize: '1rem', color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
                                                    {title}
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {tasks.map(t => (
                                                        <div
                                                            key={t.id}
                                                            className="glass-card"
                                                            onClick={() => handleToggleHygieneTask(t.id)}
                                                            style={{
                                                                padding: '16px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                borderLeft: t.completed ? '4px solid var(--success)' : '4px solid rgba(255,255,255,0.1)',
                                                                background: t.completed ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)',
                                                                opacity: t.completed ? 0.7 : 1
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                                <div onClick={(e) => { e.stopPropagation(); handleToggleHygieneTask(t.id); }}>
                                                                    {t.completed ? <CheckCircle2 size={20} color="var(--success)" /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-secondary)' }}></div>}
                                                                </div>
                                                                <span style={{ fontWeight: 500, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {t.last_completed && t.completed && (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '8px' }}>
                                                                        {new Date(t.last_completed).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); handleEditHygieneTask(t); }} className="secondary" style={{ padding: '6px' }} title="Editar Tarefa">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteHygieneTask(t.id); }} className="danger" style={{ padding: '6px' }} title="Excluir Tarefa">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </main>
                )
            }

            {/* COPIA ITENS TAB */}
            {
                activeTab === 'copy' && (
                    <main className="animate-in">
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <ShoppingCart size={28} style={{ color: 'var(--accent-primary)' }} />
                                    <h2>Copia Itens</h2>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="primary" style={{ padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FF9800, #F57C00)', border: 'none', boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)' }} onClick={handleShareShoppingList} title="Copiar Lista">
                                        <Send size={20} />
                                    </button>
                                    <button className="secondary" style={{ padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleExportToExcel} title="Exportar Excel">
                                        <Download size={20} color="#10b981" />
                                    </button>
                                    <button className="secondary" style={{ padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleExportToWord} title="Exportar Word">
                                        <Download size={20} color="#3b82f6" />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {items.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '2px dashed var(--card-border)' }}>
                                        <Package size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Estoque Vazio</h3>
                                        <p style={{ color: 'var(--text-secondary)' }}>Adicione itens no inventário para gerar a lista.</p>
                                    </div>
                                ) : (
                                    [...items].sort((a, b) => {
                                        const aLow = (a.min_value != null && a.value < a.min_value) ? 0 : 1;
                                        const bLow = (b.min_value != null && b.value < b.min_value) ? 0 : 1;
                                        return aLow - bLow || a.name.localeCompare(b.name);
                                    }).map(item => {
                                        const isLow = item.min_value != null && item.value < item.min_value;
                                        return (
                                            <div
                                                key={item.id}
                                                className="glass-card item-card"
                                                style={{
                                                    padding: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    borderLeft: isLow ? '4px solid var(--danger)' : '4px solid var(--success)',
                                                    background: isLow ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                                                    opacity: isLow ? 1 : 0.8
                                                }}
                                            >
                                                <div>
                                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{item.name}</h3>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Categoria: {item.category}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isLow ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                                                        {isLow ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                                                        <span>{item.value} / {item.min_value || '∞'} {item.unit}</span>
                                                    </div>
                                                    {isLow && (
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            Faltam: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(item.min_value || 0) - item.value} {item.unit}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </main>
                )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
                <main className="animate-in">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <BarChart2 size={24} style={{ color: 'var(--accent-primary)' }} />
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem' }}>Relatórios</h2>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date().toLocaleString('pt-BR', { month: 'long' })} / {new Date().getFullYear()}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Dia:</span>
                                        <select
                                            value={reportDayFilter || ''}
                                            onChange={e => setReportDayFilter(e.target.value ? parseInt(e.target.value) : null)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, padding: '2px 4px', cursor: 'pointer', outline: 'none' }}
                                            title="Filtrar por dia do mês"
                                        >
                                            <option value="" style={{ background: 'var(--bg-secondary)' }}>Todos</option>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                <option key={day} value={day} style={{ background: 'var(--bg-secondary)' }}>{day}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleClearHistory}
                                        title="Zerar Relatório"
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Filters Bar */}
                            <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Semanas do Mês</p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5].map(w => (
                                            <button
                                                key={w}
                                                onClick={() => setReportWeekFilter(reportWeekFilter === w ? null : w)}
                                                className={reportWeekFilter === w ? 'primary' : 'secondary'}
                                                style={{ flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '0.8rem' }}
                                            >
                                                Sem {w}
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>* Início do mês ao dia 31</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Filtrar Dia da Semana</p>
                                    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, idx) => (
                                            <button
                                                key={day}
                                                onClick={() => setReportWeekdayFilter(reportWeekdayFilter === idx ? null : idx)}
                                                className={reportWeekdayFilter === idx ? 'primary' : 'secondary'}
                                                style={{ minWidth: '40px', padding: '8px 0', borderRadius: '8px', fontSize: '0.7rem' }}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {(reportDayFilter !== null || reportWeekdayFilter !== null || reportWeekFilter !== null) && (
                                    <button
                                        onClick={() => { setReportDayFilter(null); setReportWeekdayFilter(null); setReportWeekFilter(null); }}
                                        style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', alignSelf: 'flex-start', background: 'transparent', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <X size={14} /> Limpar Filtros
                                    </button>
                                )}
                            </div>

                            {(() => {
                                const { sortedItems, sortedDays, totalActions } = getReportsData();
                                if (totalActions === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--card-border)' }}>
                                            <Search size={40} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.3 }} />
                                            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma movimentação encontrada para este filtro.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {/* Counters */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{totalActions}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Movimentos</div>
                                            </div>
                                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{sortedItems.length}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Itens Únicos</div>
                                            </div>
                                        </div>

                                        {/* Activity List */}
                                        <div>
                                            <h3 style={{ fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>Volume por Item</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {sortedItems.map((item: any) => (
                                                    <div key={item.name} className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {item.dates.map((d: string) => (
                                                                    <span key={d} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{d}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                            {item.entries > 0 && <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>+{item.entries.toFixed(1)}</span>}
                                                            {item.exits > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>-{item.exits.toFixed(1)}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Peak Days (only relevant if not filtering by a single specific day) */}
                                        {reportDayFilter === null && sortedDays.length > 1 && (
                                            <div>
                                                <h3 style={{ fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>Dias de Pico</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {sortedDays.map(([day, vol]: [string, number]) => (
                                                        <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ width: '85px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{day}</span>
                                                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${Math.min(100, (vol / sortedDays[0][1]) * 100)}%`, background: 'var(--accent-primary)', borderRadius: '3px' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{vol.toFixed(0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </main>
            )}

            {/* MODALS */}
            {
                isItemModalOpen && (
                    <div className="modal-overlay">
                        <div className="glass-card modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
                                <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div className="form-group"><label>Nome</label><input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group"><label>Categoria</label><select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                <div className="form-group"><label>Unidade</label><select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}><option value="">Selecione...</option>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group"><label>Valor Atual</label><input type="number" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} /></div>
                                <div className="form-group"><label>Mínimo (Opcional)</label><input type="number" placeholder="Sem limite" value={newItem.min_value} onChange={e => setNewItem({ ...newItem, min_value: e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                                <label>Localização (Mapa)</label>
                                <select value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} title="Selecionar Localização">
                                    <option value="">Selecione o local...</option>
                                    {locations.map((loc: Location) => (
                                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="primary"
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                }}
                                onClick={handleAddItem}
                            >
                                <Save size={18} /> {editingItem ? 'Salvar Alterações' : 'Criar Item'}
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isAdjustModalOpen && adjustingItem && (
                    <div className="modal-overlay">
                        <div className="glass-card modal-content animate-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem' }}>{adjustType === 'add' ? 'Adicionar ao' : 'Remover do'} Estoque</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{adjustingItem.name} ({adjustingItem.unit})</p>
                                </div>
                                <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div className="form-group"><label>Quantidade</label><input type="number" autoFocus placeholder="0.00" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirmAdjust()} /></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Atual</div><div style={{ fontWeight: 600 }}>{adjustingItem.value}</div></div>
                                <ChevronRight size={16} style={{ opacity: 0.3 }} />
                                <div style={{ textAlign: 'center', flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Novo</div><div style={{ fontWeight: 700, color: adjustType === 'add' ? 'var(--success)' : 'var(--danger)' }}>{adjustValue ? (adjustType === 'add' ? adjustingItem.value + parseFloat(adjustValue) : Math.max(0, adjustingItem.value - parseFloat(adjustValue))) : '-'}</div></div>
                            </div>
                            <button className="primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => handleConfirmAdjust()}>Confirmar Ajuste</button>
                        </div>
                    </div>
                )
            }

            {
                isGramatureModalOpen && (
                    <div className="modal-overlay">
                        <div className="glass-card modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Nova Gramatura</h2>
                                <button onClick={() => setIsGramatureModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div className="form-group"><label>Item</label><input type="text" placeholder="Ex: Filé" value={newGramature.name} onChange={e => setNewGramature({ ...newGramature, name: e.target.value })} /></div>
                            <div className="form-group"><label>Peso</label><input type="text" placeholder="Ex: 220g" value={newGramature.weight} onChange={e => setNewGramature({ ...newGramature, weight: e.target.value })} /></div>
                            <button
                                className="primary"
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                }}
                                onClick={handleAddGramature}
                            >
                                <Save size={18} /> Salvar Gramatura
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isVideoModalOpen && (
                    <div className="modal-overlay">
                        <div className="glass-card modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Adicionar Novo Vídeo</h2>
                                <button onClick={() => setIsVideoModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div className="form-group">
                                <label>Título</label>
                                <input type="text" placeholder="Ex: Monitoramento Freezer A" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descrição (Opcional)</label>
                                <textarea
                                    placeholder="Detalhes sobre o vídeo..."
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        color: 'var(--text-primary)',
                                        minHeight: '100px',
                                        resize: 'vertical'
                                    }}
                                    value={newVideo.description}
                                    onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Arquivo de Vídeo</label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={e => setNewVideo({ ...newVideo, file: e.target.files ? e.target.files[0] : null })}
                                    style={{ padding: '8px' }}
                                />
                            </div>
                            <button
                                className="primary"
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                }}
                                onClick={handleAddVideo}
                                disabled={uploadingVideo}
                            >
                                {uploadingVideo ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {uploadingVideo ? 'Enviando...' : 'Salvar Vídeo'}
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isCategoryModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Categorias</h2>
                                <button onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', maxWidth: '300px', padding: '8px' }} placeholder="Nova categoria..." onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                                <button className="primary" onClick={handleAddCategory} title="Adicionar Categoria"><Plus size={18} /></button>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {categories.map(c => (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                        <span>{c.name}</span>
                                        <button className="danger" style={{ padding: '4px' }} onClick={() => handleDeleteCategory(c.id)} title="Excluir Categoria"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isLocationModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsLocationModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Localizações</h2>
                                <button onClick={() => setIsLocationModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Fechar"><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} style={{ width: '100%', maxWidth: '300px', padding: '8px' }} placeholder="Ex: Prateleira A1..." onKeyDown={e => e.key === 'Enter' && handleAddLocation()} />
                                <button className="primary" onClick={handleAddLocation} title="Adicionar Localização"><Plus size={18} /></button>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {locations.map((loc: Location) => (
                                    <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                        <span>{loc.name}</span>
                                        <button className="danger" style={{ padding: '4px' }} onClick={() => handleDeleteLocation(loc.id)} title="Excluir Localização"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                {locations.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Nenhuma localização cadastrada.</p>}
                            </div>
                        </div>
                    </div>
                )
            }


            {
                isTaskModalOpen && (
                    <div className="modal-overlay">
                        <div className="glass-card modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Nova Tarefa</h2>
                                <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }}><X size={20} /></button>
                            </div>
                            <div className="form-group">
                                <label>Título da Tarefa</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Limpeza do Freezer A"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Descrição (Opcional)</label>
                                <textarea
                                    placeholder="Detalhes da tarefa..."
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        color: 'var(--text-primary)',
                                        minHeight: '80px',
                                        resize: 'vertical'
                                    }}
                                    value={newTask.description}
                                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                            <button
                                className="primary"
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
                                }}
                                onClick={handleAddTask}
                            >
                                <Save size={18} /> Salvar Tarefa
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isHygieneModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsHygieneModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>{editingHygieneTask ? 'Editar Tarefa' : 'Nova Tarefa de Higiene'}</h2>
                                <button onClick={() => setIsHygieneModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }}><X size={20} /></button>
                            </div>

                            <div className="form-group">
                                <label>Título da Tarefa</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Limpeza da bancada"
                                    value={newHygieneTask.title}
                                    onChange={e => setNewHygieneTask({ ...newHygieneTask, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Frequência</label>
                                <select
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '12px', color: 'var(--text-primary)' }}
                                    value={newHygieneTask.frequency}
                                    onChange={e => setNewHygieneTask({ ...newHygieneTask, frequency: e.target.value as any })}
                                >
                                    <option value="daily" style={{ background: '#1e293b' }}>Diária</option>
                                    <option value="weekly" style={{ background: '#1e293b' }}>Semanal</option>
                                    <option value="monthly" style={{ background: '#1e293b' }}>Mensal</option>
                                </select>
                            </div>

                            <button className="primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleAddHygieneTask}>
                                <Save size={18} /> {editingHygieneTask ? 'Atualizar' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isLogoutModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Confirmar Logout</h2>
                                <button onClick={() => setIsLogoutModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }}><X size={20} /></button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Digite sua senha para confirmar o logout.</p>
                            <div className="form-group">
                                <label>Senha</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={logoutPassword}
                                    onChange={e => setLogoutPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLogout()}
                                    autoFocus
                                />
                            </div>
                            <button className="danger" style={{ width: '100%', marginTop: '12px' }} onClick={handleLogout}>
                                <LogOut size={18} /> Confirmar Logout
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isClearReportModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsClearReportModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Zerar Relatório</h2>
                                <button onClick={() => setIsClearReportModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }}><X size={20} /></button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Esta ação irá <strong>apagar todo o histórico</strong> permanentemente. Os relatórios ficarão vazios.
                            </p>
                            <div className="form-group">
                                <label>Digite sua senha para confirmar</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={clearReportPassword}
                                    onChange={e => setClearReportPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && confirmClearReport()}
                                    autoFocus
                                />
                            </div>
                            <button className="danger" style={{ width: '100%', marginTop: '12px' }} onClick={confirmClearReport} disabled={loading}>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Apagar Tudo</>}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* SIDEBAR / HAMBURGER MENU */}
            {
                isSidebarOpen && (
                    <div className="modal-overlay" onClick={() => setIsSidebarOpen(false)} style={{ justifyContent: 'flex-end', padding: 0 }}>
                        <div
                            className="glass-card animate-in-right"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '280px',
                                height: '100%',
                                borderRadius: '20px 0 0 20px',
                                padding: '32px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', padding: '4px' }} title="Fechar"><X size={24} /></button>
                                <h2 style={{ fontSize: '1.5rem', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'right' }}>Sala Fria</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px', paddingLeft: '8px' }}>Principal</p>
                                <button
                                    className={activeTab === 'reports' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Relatórios <BarChart2 size={20} />
                                </button>
                                <button
                                    className={activeTab === 'history' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Histórico <History size={20} />
                                </button>
                                <button
                                    className={activeTab === 'copy' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('copy'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Copia Itens <ShoppingCart size={20} />
                                </button>
                                <button
                                    className={activeTab === 'hygiene' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('hygiene'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Higiene <ShieldCheck size={20} />
                                </button>

                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px', paddingLeft: '8px', marginTop: '12px' }}>Monitoramento</p>
                                <button
                                    className={activeTab === 'video' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('video'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Vídeos <Video size={20} />
                                </button>

                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px', paddingLeft: '8px', marginTop: '12px' }}>Configuração</p>
                                <button
                                    className="secondary"
                                    onClick={() => { setIsLocationModalOpen(true); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Localizações <Layers size={20} />
                                </button>
                                <button
                                    className="secondary"
                                    onClick={() => { setIsCategoryModalOpen(true); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Categorias <List size={20} />
                                </button>
                                <button
                                    className={activeTab === 'gramature' ? 'primary' : 'secondary'}
                                    onClick={() => { setActiveTab('gramature'); setIsSidebarOpen(false); }}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    Gramaturas <Scaling size={20} />
                                </button>
                                {deferredPrompt && (
                                    <button
                                        className="primary"
                                        onClick={handleInstallApp}
                                        style={{
                                            width: '100%',
                                            justifyContent: 'space-between',
                                            marginTop: '12px',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                        }}
                                    >
                                        Instalar Aplicativo <Download size={20} />
                                    </button>
                                )}
                            </div>

                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '0 8px' }}>
                                    <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{session?.user.email?.split('@')[0]}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status: {isOnline ? 'Online' : 'Offline'}</p>
                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '2px', letterSpacing: '0.5px' }}>v1.2</p>
                                    </div>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={18} color="white" />
                                    </div>
                                </div>
                                <button
                                    className="danger"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={() => { setIsSidebarOpen(false); setIsLogoutModalOpen(true); }}
                                >
                                    <LogOut size={18} /> Sair do App
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                isExportFormatModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsExportFormatModalOpen(false)}>
                        <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.25rem' }}>Exportar como {exportType === 'excel' ? 'Excel' : 'Word'}</h2>
                                <button onClick={() => setIsExportFormatModalOpen(false)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {exportType === 'excel' ? (
                                    <>
                                        <button
                                            className="secondary"
                                            onClick={() => performExport('xls')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', textAlign: 'left' }}
                                        >
                                            <div style={{ fontWeight: 600 }}>Excel (.xls)</div>
                                            <ArrowRight size={18} />
                                        </button>
                                        <button
                                            className="secondary"
                                            onClick={() => performExport('google')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', textAlign: 'left' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Download size={18} style={{ color: 'var(--success)' }} />
                                                </div>
                                                <div style={{ fontWeight: 600 }}>Planilhas Google (.csv)</div>
                                            </div>
                                            <ArrowRight size={18} />
                                        </button>
                                        <button
                                            className="primary"
                                            onClick={() => performExport('clipboard')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', textAlign: 'left', background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', boxShadow: 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CheckSquare size={18} />
                                                </div>
                                                <div style={{ fontWeight: 600 }}>Copiar p/ Planilha (Rápido)</div>
                                            </div>
                                            <ArrowRight size={18} />
                                        </button>
                                        <button
                                            className="secondary"
                                            onClick={() => performExport('csv')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', textAlign: 'left' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Download size={18} />
                                                </div>
                                                <div style={{ fontWeight: 600 }}>CSV (.csv)</div>
                                            </div>
                                            <ArrowRight size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="secondary"
                                            onClick={() => performExport('doc')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', textAlign: 'left' }}
                                        >
                                            <div style={{ fontWeight: 600 }}>Word (.doc)</div>
                                            <ArrowRight size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default App;
