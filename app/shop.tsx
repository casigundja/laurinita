'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  Plus,
  Minus,
  X,
  LayoutDashboard,
  Package,
  Activity,
  Users,
  ClipboardList,
  Download,
  Check,
  SlidersHorizontal,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Grid3X3,
  List as ListIcon,
  Trash2,
  AlertCircle,
  CreditCard,
  Building2,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit,
  Eye,
  EyeOff,
  Settings,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  UserCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  Key,
  Database,
  Star,
  Heart,
  Moon,
  Sun,
  Layers,
  Sparkles,
  Stethoscope,
  BadgePercent,
  CheckCircle,
  Send,
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  Upload,
  Link2,
  Image as ImageIcon
} from 'lucide-react';
import QRCode from 'qrcode';
import { catalog, CatalogProduct, STORE_INFO, formatKwanzas } from '../lib/catalog';
import {
  ANGOLA_PROVINCES,
  PAYMENT_METHODS,
  BANK_ACCOUNTS,
  ORDER_STATUSES,
  ProvinceDelivery,
  PaymentMethodId,
  OrderStatus,
  StockMovement
} from '../lib/angola-config';
import {
  UserSession,
  UserRole,
  ROLE_PERMISSIONS,
  hasPermission
} from '../lib/auth';

type ViewMode = 'grid' | 'list';
export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  provinceId: string;
  provinceName: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethodId;
  paymentPhone?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function Shop({ initialView = 'shop' }: { initialView?: 'shop' | 'admin' | 'login' } = {}) {
  // Navigation & view states
  const [view, setView] = useState<'shop' | 'admin' | 'login'>(initialView);

  const navigateTo = (newView: 'shop' | 'admin' | 'login') => {
    setView(newView);
    if (typeof window !== 'undefined') {
      const targetPath = newView === 'admin' ? '/dashboard' : (newView === 'login' ? '/login' : '/');
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: newView }, '', targetPath);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLogin = window.location.pathname.startsWith('/login');
      const isDash = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin');
      if (isLogin && view !== 'login') {
        setView('login');
      } else if (isDash && view !== 'admin') {
        setView('admin');
      } else if (!isDash && !isLogin && (view === 'admin' || view === 'login')) {
        if (window.location.pathname === '/') {
          if (initialView === 'admin') {
            window.history.replaceState({ view: 'admin' }, '', '/dashboard');
          } else if (initialView === 'login') {
            window.history.replaceState({ view: 'login' }, '', '/login');
          }
        }
      }
    }
  }, [initialView, view]);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const isLogin = window.location.pathname.startsWith('/login');
        const isDash = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin');
        setView(isLogin ? 'login' : (isDash ? 'admin' : 'shop'));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [adminTab, setAdminTab] = useState<'overview' | 'products' | 'stock' | 'orders' | 'customers' | 'reports' | 'users' | 'settings'>('overview');
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dbConnected, setDbConnected] = useState(false);

  // Theme state (Dark / Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Authentication & Access Control (RBAC) state
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (view === 'login' && currentUser) {
      navigateTo('admin');
    } else if (view === 'admin' && !currentUser) {
      navigateTo('login');
    }
  }, [view, currentUser]);

  // Catalog state (backed by SQLite database and initial catalog)
  const [products, setProducts] = useState<CatalogProduct[]>(catalog);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [shopPage, setShopPage] = useState(1);
  const [shopRowsPerPage, setShopRowsPerPage] = useState(15);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  // Header popovers
  const [openAcess, setOpenAcess] = useState(false);
  const [openGrupo, setOpenGrupo] = useState(false);

  // Chat Support Modal
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Olá! Bem-vindo à Laurinita Distribuidora Ltda. Como podemos apoiar a sua clínica ou hospital hoje com cotações e equipamentos?',
      time: 'Agora'
    }
  ]);

  // Modals & Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<CatalogProduct | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(1);
  const [stockReason, setStockReason] = useState<string>('');
  const [stockMovementType, setStockMovementType] = useState<StockMovement['type']>('Entrada');

  // Dashboard management state
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategory, setAdminCategory] = useState('Todos');
  const [adminPage, setAdminPage] = useState(1);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(15);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Análises Clínicas');
  const [newProdPrice, setNewProdPrice] = useState<number>(150000);
  const [newProdStock, setNewProdStock] = useState<number>(5);
  const [newProdMin, setNewProdMin] = useState<number>(1);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [localFileName, setLocalFileName] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Cart & Order Form State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Contact & WhatsApp Ordering Modal States (Adaptado ao design da loja)
  const [orderContactModalOpen, setOrderContactModalOpen] = useState(false);
  const [orderStep, setOrderStep] = useState<'contact' | 'whatsapp'>('contact');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [whatsAppOrderUrl, setWhatsAppOrderUrl] = useState('');
  const [activeOrderItems, setActiveOrderItems] = useState<Array<{ product: CatalogProduct; quantity: number }>>([]);

  // Checkout Fields
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('luanda');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId>('multicaixa_express');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Orders and Audit Logs
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Initialize theme from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('laurinita_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('laurinita_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('laurinita_theme', 'light');
    }
  }

  // Hero carousel auto-timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss all alerts automatically
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError('');
    }, 3800);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!loginError) return;
    const timer = setTimeout(() => {
      setLoginError('');
    }, 3800);
    return () => clearTimeout(timer);
  }, [loginError]);

  // Fetch Database Data on load
  async function fetchDbData() {
    try {
      let token = currentUser?.token || '';
      if (!token && typeof window !== 'undefined') {
        const savedSession = localStorage.getItem('laurinita_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            token = parsed?.token || '';
          } catch (e) {}
        }
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/store', { headers });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          setDbConnected(true);
        }
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
        if (Array.isArray(data.movements)) {
          setStockMovements(data.movements);
        }
      }
    } catch (err) {
      console.warn('API /api/store offline or in local fallback mode:', err);
    }
  }

  useEffect(() => {
    fetchDbData();
    // Load local stored cart and customer
    const savedCart = localStorage.getItem('laurinita_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    const savedCustomer = localStorage.getItem('laurinita_customer');
    if (savedCustomer) {
      try {
        const c = JSON.parse(savedCustomer);
        setCustomerName(c.name || '');
        setCustomerNif(c.nif || '');
        setCustomerPhone(c.phone || '');
        setCustomerEmail(c.email || '');
        setSelectedProvinceId(c.provinceId || 'luanda');
        setDeliveryAddress(c.address || '');
      } catch (e) {}
    }
    const savedFavs = localStorage.getItem('laurinita_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }

    // Load active session from localStorage
    const savedSession = localStorage.getItem('laurinita_session');
    if (savedSession) {
      try { setCurrentUser(JSON.parse(savedSession)); } catch (e) {}
    }

    setReady(true);
  }, []);

  // Persist cart
  useEffect(() => {
    if (ready) {
      localStorage.setItem('laurinita_cart', JSON.stringify(cart));
    }
  }, [cart, ready]);

  // Persist favorites
  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('laurinita_favorites', JSON.stringify(next));
      setNotice(exists ? 'Item removido dos favoritos.' : 'Item salvo nos favoritos!');
      return next;
    });
  }

  // Categories list
  const categories = useMemo(() => {
    const source = products.length > 0 ? products : catalog;
    const set = new Set<string>();
    source.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    const selectedCat = normalizeSearchText(selectedCategory);

    let result = products.filter((p) => {
      const pCat = normalizeSearchText(p.category);
      const matchesCategory = selectedCat === 'todos' || pCat === selectedCat;
      const matchesSearch =
        !q ||
        normalizeSearchText(p.name).includes(q) ||
        pCat.includes(q) ||
        normalizeSearchText(p.description).includes(q) ||
        (p.technicalSpecs && normalizeSearchText(p.technicalSpecs).includes(q));
      const matchesStock = !onlyAvailable || (p.isAvailable && p.stock > 0);
      const matchesDiscount = !onlyDiscount || Boolean(p.discount && p.discount > 0);
      return matchesCategory && matchesSearch && matchesStock && matchesDiscount;
    });

    if (sortOption === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'newest') {
      result.reverse();
    }
    return result;
  }, [products, selectedCategory, searchQuery, sortOption, onlyAvailable, onlyDiscount]);

  // Shop Pagination computed values
  const totalShopPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / shopRowsPerPage));
  }, [filteredProducts.length, shopRowsPerPage]);

  const paginatedShopProducts = useMemo(() => {
    const start = (shopPage - 1) * shopRowsPerPage;
    return filteredProducts.slice(start, start + shopRowsPerPage);
  }, [filteredProducts, shopPage, shopRowsPerPage]);

  const startShopItem = useMemo(() => {
    return filteredProducts.length === 0 ? 0 : (shopPage - 1) * shopRowsPerPage + 1;
  }, [filteredProducts.length, shopPage, shopRowsPerPage]);

  const endShopItem = useMemo(() => {
    return Math.min(shopPage * shopRowsPerPage, filteredProducts.length);
  }, [filteredProducts.length, shopPage, shopRowsPerPage]);

  useEffect(() => {
    setShopPage(1);
  }, [selectedCategory, searchQuery, onlyAvailable, onlyDiscount, sortOption, shopRowsPerPage]);

  // Admin Dashboard Computed Values
  const adminCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const filteredAdminProducts = useMemo(() => {
    const q = normalizeSearchText(adminSearch);
    const cat = normalizeSearchText(adminCategory);

    return products.filter((p) => {
      const pCat = normalizeSearchText(p.category);
      const matchCat = cat === 'todos' || pCat === cat;
      const matchSearch =
        !q ||
        normalizeSearchText(p.name).includes(q) ||
        pCat.includes(q) ||
        normalizeSearchText(p.id).includes(q) ||
        normalizeSearchText(p.description).includes(q);
      return matchCat && matchSearch;
    });
  }, [products, adminSearch, adminCategory]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= (p.minimum || 1));
  }, [products]);

  const totalInventoryUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock || 0), 0);
  }, [products]);

  // Admin Pagination computed values
  const totalAdminPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAdminProducts.length / adminRowsPerPage));
  }, [filteredAdminProducts.length, adminRowsPerPage]);

  const paginatedAdminProducts = useMemo(() => {
    const start = (adminPage - 1) * adminRowsPerPage;
    return filteredAdminProducts.slice(start, start + adminRowsPerPage);
  }, [filteredAdminProducts, adminPage, adminRowsPerPage]);

  const startAdminItem = useMemo(() => {
    return filteredAdminProducts.length === 0 ? 0 : (adminPage - 1) * adminRowsPerPage + 1;
  }, [filteredAdminProducts.length, adminPage, adminRowsPerPage]);

  const endAdminItem = useMemo(() => {
    return Math.min(adminPage * adminRowsPerPage, filteredAdminProducts.length);
  }, [filteredAdminProducts.length, adminPage, adminRowsPerPage]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch, adminCategory, adminRowsPerPage]);

  // Cart Calculations
  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((p) => p.id === id);
        if (!product || quantity <= 0) return null;
        return {
          product,
          quantity,
          lineTotal: product.price * quantity,
        };
      })
      .filter((item): item is { product: CatalogProduct; quantity: number; lineTotal: number } => item !== null);
  }, [cart, products]);

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }, [cartLines]);

  const currentProvince = useMemo(() => {
    return ANGOLA_PROVINCES.find((p) => p.id === selectedProvinceId) || ANGOLA_PROVINCES[0];
  }, [selectedProvinceId]);

  const deliveryFee = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    return currentProvince.fee;
  }, [cartSubtotal, currentProvince]);

  const discountAmount = useMemo(() => {
    if (!couponApplied || discountPercent <= 0) return 0;
    return (cartSubtotal * discountPercent) / 100;
  }, [couponApplied, discountPercent, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + deliveryFee);
  }, [cartSubtotal, discountAmount, deliveryFee]);

  // Cart actions
  function addToCart(product: CatalogProduct) {
    setCart((prev) => {
      const current = prev[product.id] || 0;
      return { ...prev, [product.id]: current + 1 };
    });
    setNotice(`"${product.name}" adicionado à sacola.`);
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  }

  function applyCoupon() {
    if (couponCode.trim().toUpperCase() === 'LAURINITA10') {
      setCouponApplied(true);
      setDiscountPercent(10);
      setNotice('Cupom LAURINITA10 aplicado! 10% de desconto concedido.');
    } else {
      setError('Cupom inválido. Experimente "LAURINITA10"');
    }
  }

  // Active Order Items for Contact & WhatsApp Flow (adaptado ao design da loja)
  const activeOrderList = useMemo(() => {
    if (activeOrderItems.length > 0) return activeOrderItems;
    return cartLines.map((l) => ({ product: l.product, quantity: l.quantity }));
  }, [activeOrderItems, cartLines]);

  const activeOrderCount = useMemo(() => {
    return activeOrderList.reduce((sum, item) => sum + item.quantity, 0);
  }, [activeOrderList]);

  const activeOrderTotal = useMemo(() => {
    const sub = activeOrderList.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const fee = deliveryMethod === 'delivery' ? deliveryFee : 0;
    return sub + fee;
  }, [activeOrderList, deliveryMethod, deliveryFee]);

  function handleStartOrder(product?: CatalogProduct) {
    if (product) {
      setActiveOrderItems([{ product, quantity: 1 }]);
    } else if (cartLines.length > 0) {
      setActiveOrderItems(cartLines.map((l) => ({ product: l.product, quantity: l.quantity })));
    } else {
      setNotice('Selecione um equipamento para fazer o pedido.');
      return;
    }
    setOrderStep('contact');
    setOrderContactModalOpen(true);
    setCartDrawerOpen(false);
  }

  async function handleProceedToWhatsApp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!orderCustomerName.trim()) {
      setError('Por favor, informe o seu nome.');
      return;
    }
    if (!orderCustomerPhone.trim()) {
      setError('Por favor, informe o seu número de telemóvel / WhatsApp.');
      return;
    }
    if (deliveryMethod === 'delivery' && !orderDeliveryAddress.trim()) {
      setError('Por favor, informe o endereço completo para entrega.');
      return;
    }

    const itemsToOrder = activeOrderItems.length > 0 ? activeOrderItems : cartLines;
    if (itemsToOrder.length === 0) {
      setError('O seu pedido não possui equipamentos.');
      return;
    }

    const subtotal = itemsToOrder.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
    const fee = deliveryMethod === 'delivery' ? deliveryFee : 0;
    const finalTotal = subtotal + fee;

    const itemsText = itemsToOrder
      .map((item, idx) => `${idx + 1}. *${item.product.name}*\n   Qtd: ${item.quantity} un. | Valor: ${formatKwanzas(item.product.price * item.quantity)}`)
      .join('\n\n');

    const message = `Olá, Laurinita Distribuidora Ltda! 👋
Gostaria de formalizar o seguinte pedido:

👤 *DADOS DE CONTATO:*
• *Nome:* ${orderCustomerName.trim()}
• *Telemóvel:* ${orderCustomerPhone.trim()}
• *Tipo de Recebimento:* ${deliveryMethod === 'delivery' ? '🚚 Entrega em domicílio' : '🛍️ Para levantar/remover'}
${deliveryMethod === 'delivery' ? `• *Endereço:* ${orderDeliveryAddress.trim()}\n• *Província:* ${currentProvince.name}` : '• *Local de Levantamento:* Loja Laurinita Luanda'}
${orderRemarks.trim() ? `• *Observações:* ${orderRemarks.trim()}\n` : ''}
📦 *ITENS DO PEDIDO:*
${itemsText}

💰 *VALOR TOTAL:* ${formatKwanzas(finalTotal)}
----------------------------------
Aguardo confirmação e dados para pagamento / fatura!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodedMessage}`;
    setWhatsAppOrderUrl(waUrl);

    // Generate real QR code
    try {
      const qrData = await QRCode.toDataURL(waUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#071326',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrData);
    } catch (err) {
      console.warn('QR generation error:', err);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(waUrl)}`);
    }

    // Register order asynchronously in DB
    try {
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          customer: orderCustomerName.trim(),
          phone: orderCustomerPhone.trim(),
          address: deliveryMethod === 'delivery' ? orderDeliveryAddress.trim() : 'Levantamento no Armazém',
          provinceId: selectedProvinceId,
          paymentMethod: 'multicaixa_express',
          items: itemsToOrder.map((it) => ({ id: it.product.id, quantity: it.quantity })),
          notes: `[Pedido WhatsApp / ${deliveryMethod === 'delivery' ? 'Entrega' : 'Levantamento'}] ${orderRemarks.trim()}`
        })
      }).then(() => fetchDbData()).catch(() => {});
    } catch (e) {}

    setOrderStep('whatsapp');
  }

  // User Login Handler
  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      const session: UserSession = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        token: data.user?.token || data.token,
      };

      setCurrentUser(session);
      localStorage.setItem('laurinita_session', JSON.stringify(session));
      setShowLoginModal(false);
      setUserMenuOpen(false);
      setNotice(`Bem-vindo(a), ${session.name}! Sessão iniciada com sucesso.`);
      navigateTo('admin');
      fetchDbData();
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem('laurinita_session');
    setView('shop');
    setUserMenuOpen(false);
    setNotice('Sessão terminada.');
  }

  // Stock manipulation and management actions
  async function handleQuickStock(productId: string, delta: number) {
    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      setError('Acesso restrito: apenas Administrador ou Gerente podem alterar o estoque.');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (prod.stock + delta < 0) {
      setError(`O estoque de "${prod.name}" não pode ficar negativo (atual: ${prod.stock} un.).`);
      return;
    }

    const reason = delta > 0 ? 'Entrada rápida no painel de gestão' : 'Saída rápida no painel de gestão';

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: p.stock + delta, isAvailable: p.stock + delta > 0 } : p))
    );

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          action: 'movement',
          productId,
          delta,
          reason,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao sincronizar estoque no banco.');
      }

      setNotice(`Estoque de "${prod.name}" atualizado (${delta > 0 ? `+${delta}` : delta} un.).`);
      fetchDbData();
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar estoque no banco de dados.');
      fetchDbData();
    }
  }

  async function submitManualMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!stockModalProduct) return;
    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      setError('Apenas Administradores e Gerentes podem registar movimentações.');
      return;
    }

    const qty = Math.max(1, Math.round(Number(stockDelta)));
    const finalDelta = stockMovementType === 'Entrada' ? qty : -qty;

    if (stockModalProduct.stock + finalDelta < 0) {
      setError(`A saída solicitada (${qty} un.) excede o saldo atual em estoque (${stockModalProduct.stock} un.).`);
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          action: 'movement',
          productId: stockModalProduct.id,
          delta: finalDelta,
          reason: stockReason.trim() || `${stockMovementType} manual de inventário`,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao processar movimentação.');
      }

      setNotice(`Movimentação de ${finalDelta > 0 ? `+${finalDelta}` : finalDelta} un. em "${stockModalProduct.name}" registada no banco com sucesso.`);
      setStockModalProduct(null);
      setStockReason('');
      setStockDelta(1);
      fetchDbData();
    } catch (err: any) {
      setError(err.message || 'Erro ao gravar movimentação no banco.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  }

  async function handleUpdateOrderStatus(orderId: string, newStatus: OrderStatus) {
    if (!currentUser || !['admin', 'manager', 'operator'].includes(currentUser.role)) {
      setError('Permissão insuficiente para alterar o status da encomenda.');
      return;
    }

    // Optimistic update
    setOrders((prev) =>
      prev.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          action: 'status',
          id: orderId,
          status: newStatus,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao atualizar status da encomenda.');
      }

      setNotice(`Encomenda #${orderId} atualizada para "${newStatus}".`);
      fetchDbData();
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar status no banco.');
      fetchDbData();
    }
  }

  function handleImageFileSelect(file: File) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Por favor selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setNewProdImg(compressedDataUrl);
            setLocalFileName(file.name);
          } else {
            setNewProdImg(event.target?.result as string);
            setLocalFileName(file.name);
          }
        } catch {
          setNewProdImg(event.target?.result as string);
          setLocalFileName(file.name);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      setError('Apenas Administrador ou Gerente podem cadastrar equipamentos.');
      return;
    }

    if (!newProdName.trim() || newProdPrice <= 0) {
      setError('Preencha o nome do equipamento e um preço válido em Kwanzas.');
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const payloadProduct = {
        name: newProdName.trim(),
        category: newProdCategory,
        price: Number(newProdPrice),
        description: newProdDesc.trim() || 'Equipamento hospitalar e clínico certificado com garantia oficial.',
        minimum: Number(newProdMin) || 1,
        imageUrl: newProdImg.trim() || '/products/monitor-uti.png',
        active: true,
      };

      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          action: 'product',
          product: payloadProduct,
          initialStock: Number(newProdStock) || 0,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao salvar novo equipamento.');
      }

      setNotice(`Equipamento "${newProdName}" cadastrado no banco com estoque inicial de ${newProdStock} un.!`);
      setNewProductModalOpen(false);
      setNewProdName('');
      setNewProdDesc('');
      setNewProdPrice(150000);
      setNewProdStock(5);
      setNewProdImg('');
      setLocalFileName('');
      fetchDbData();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar equipamento.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  }

  // Checkout submission
  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cartLines.length) return;

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setError('Por favor preencha o Nome, Telefone e Endereço de entrega.');
      return;
    }

    if (selectedPaymentMethod === 'multicaixa_express') {
      const targetPhone = (paymentPhone || customerPhone).replace(/\s+/g, '');
      if (!/^9\d{8}$/.test(targetPhone)) {
        setError('Número MULTICAIXA Express inválido. Insira 9 dígitos começando por 9 (ex: 923 000 000).');
        return;
      }
    }

    if (selectedPaymentMethod === 'cash_on_delivery' && !['luanda', 'bengo'].includes(selectedProvinceId)) {
      setError('O Pagamento na Entrega está disponível exclusivamente para as províncias de Luanda e Bengo.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payloadItems = cartLines.map((l) => ({
        id: l.product.id,
        quantity: l.quantity,
      }));

      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          customer: customerName,
          phone: customerPhone,
          email: customerEmail,
          nif: customerNif,
          address: deliveryAddress,
          provinceId: selectedProvinceId,
          paymentMethod: selectedPaymentMethod,
          items: payloadItems,
          notes: orderNotes,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao processar a encomenda.');
      }

      const orderNumber = data.orderId || `LAU-${Date.now().toString().slice(-6)}`;
      const newOrder: OrderRecord = {
        id: orderNumber,
        orderNumber,
        customerName,
        customerPhone,
        customerEmail,
        provinceId: selectedProvinceId,
        provinceName: currentProvince.name,
        deliveryAddress,
        paymentMethod: selectedPaymentMethod,
        items: cartLines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          price: l.product.price,
          quantity: l.quantity,
        })),
        subtotal: cartSubtotal,
        deliveryFee,
        total: cartTotal,
        status: 'Pendente',
        createdAt: new Date().toLocaleString('pt-AO'),
        notes: orderNotes,
      };

      setOrders((prev) => [newOrder, ...prev]);
      setCart({});
      setCheckoutModalOpen(false);
      setCartDrawerOpen(false);
      setNotice(`Encomenda #${orderNumber} registada com sucesso! Fatura Proforma gerada.`);
      fetchDbData();
    } catch (err: any) {
      setError(err.message || 'Erro ao emitir fatura proforma.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  // Handle chat message
  function sendChatMessage() {
    if (!chatMessage.trim()) return;
    const msg = chatMessage.trim();
    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: msg, time: 'Agora' }
    ]);
    setChatMessage('');

    setTimeout(() => {
      let reply = 'Agradecemos o seu contacto! Um dos nossos consultores biomédicos entrará em contacto direto pelo WhatsApp para detalhar a cotação oficial com NIF.';
      if (msg.toLowerCase().includes('nif') || msg.toLowerCase().includes('factura')) {
        reply = 'Emitimos Facturas Proforma e Facturas Recibo com NIF oficial em total conformidade com a AGT Angola. Pode solicitar diretamente no checkout ou através do nosso WhatsApp oficial.';
      } else if (msg.toLowerCase().includes('entrega') || msg.toLowerCase().includes('prazo')) {
        reply = 'Realizamos entregas em Luanda em 24h a 48h úteis e despachamos para todas as restantes províncias de Angola via transportadoras parceiras.';
      }
      setChatHistory((prev) => [
        ...prev,
        { sender: 'agent', text: reply, time: 'Agora' }
      ]);
    }, 800);
  }

  // Carousel Slides data (Medical Equipment Hospitalar)
  const heroSlides = [
    {
      kicker: 'DESTAQUE HOSPITALAR • UTI & EMERGÊNCIA',
      title: 'Monitor Multiparamétrico',
      titleHighlight: 'UTI 12.1" COLORIDO',
      desc: 'Medição contínua de ECG, SpO2, NIBP e sinais vitais homologado para UTI.',
      shortDesc: 'Sinais vitais em tempo real (ECG, SpO2, NIBP) para UTI.',
      price: '3.850.000,00 AOA',
      image: '/products/monitor-uti.png',
      productSlug: 'monitor-de-sinais-vitais',
      category: 'UTI & Cuidados Intensivos'
    },
    {
      kicker: 'ANÁLISES CLÍNICAS & LABORATÓRIO',
      title: 'Microscópio Biológico',
      titleHighlight: 'COM TELA LCD INTEGRADA',
      desc: 'Óptica acromática até 2500x com ecrã digital LCD integrado para laudo imediato.',
      shortDesc: 'Óptica acromática 2500x com tela LCD digital integrada.',
      price: '620.000,00 AOA',
      image: '/products/microscopio-lcd.png',
      productSlug: 'microscopio-biologico-lcd',
      category: 'Análises Clínicas'
    },
    {
      kicker: 'DIAGNÓSTICO & IMAGIOLOGIA CLÍNICA',
      title: 'Ecógrafo Doppler Colorido',
      titleHighlight: 'PORTÁTIL MULTIDISCIPLINAR',
      desc: 'Sondas convexa e linear de alta frequência para cardiologia e obstetrícia.',
      shortDesc: 'Ecógrafo portátil com sondas convexa e linear.',
      price: '12.400.000,00 AOA',
      image: '/products/ecografo-mindray.png',
      productSlug: 'ecografo-doppler-colorido',
      category: 'Diagnóstico & Imagiologia'
    }
  ];

  if (view === 'login') {
    return (
      <div className="klasse-auth-viewport">
        {notice && (
          <div className="toast-notification toast-success" role="status" style={{ zIndex: 9999 }}>
            <CheckCircle2 size={18} className="toast-icon toast-icon-success" />
            <span className="toast-text">{notice}</span>
            <button onClick={() => setNotice('')} className="toast-close-btn" aria-label="Fechar">
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div className="toast-notification toast-error" role="alert" style={{ zIndex: 9999 }}>
            <AlertCircle size={18} className="toast-icon toast-icon-error" />
            <span className="toast-text">{error}</span>
            <button onClick={() => setError('')} className="toast-close-btn" aria-label="Fechar">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Left background image */}
        <div aria-hidden="true" className="klasse-auth-bg-image" />

        {/* Left deep green gradient overlay */}
        <div aria-hidden="true" className="klasse-auth-bg-gradient" />

        {/* Desktop right white container panel */}
        <div aria-hidden="true" className="klasse-auth-desktop-white-panel" />

        {/* Main Content */}
        <main className="klasse-auth-main">
          {/* Top-right language badge */}
          <div className="klasse-auth-lang-badge">
            <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 20, borderRadius: 3, backgroundColor: '#169b62', fontSize: '0.75rem', lineHeight: 1 }}>
              🇦🇴
            </span>
            <span>Português</span>
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </div>

          <section className="klasse-auth-card-section">
            <div>
              {/* Brand Logo Header */}
              <div className="klasse-auth-logo-header">
                <img
                  src="/laurinita-logo-mark.svg"
                  alt="Laurinita"
                  width={42}
                  height={42}
                  style={{ width: 42, height: 42, objectFit: 'contain' }}
                />
                <span>
                  <strong className="klasse-auth-brand-name">LAURINITA</strong>
                  <small className="klasse-auth-brand-sub">DISTRIBUIÇÃO HOSPITALAR &amp; MÉDICA</small>
                </span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="klasse-auth-title">Entrar no portal</h1>
              <p className="klasse-auth-subtitle">
                Acesso exclusivo para gestão corporativa e hospitalar
              </p>

              {loginError && (
                <div className="klasse-auth-error-alert" role="alert">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div className="klasse-auth-field">
                  <label className="klasse-auth-label">Identificador de acesso</label>
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="Email ou utilizador corporativo"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="klasse-auth-input"
                  />
                  <p className="klasse-auth-input-helper">
                    Colaboradores autorizados com credenciais ativas.
                  </p>
                </div>

                <div className="klasse-auth-field">
                  <label className="klasse-auth-label">Senha</label>
                  <div className="klasse-auth-pw-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="klasse-auth-input klasse-auth-pw-input"
                    />
                    <button
                      type="button"
                      className="klasse-auth-pw-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="klasse-auth-remember-row">
                  <label className="klasse-auth-remember-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="klasse-auth-checkbox"
                    />
                    <span>Lembrar-me</span>
                  </label>
                  <a
                    href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent('Olá, preciso de suporte para recuperar o acesso ao portal da Laurinita Distribuidora.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="klasse-auth-recovery-link"
                  >
                    Recuperar acesso
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="klasse-auth-submit-btn"
                >
                  <Key size={16} />
                  <span>{loginLoading ? 'A autenticar...' : 'Entrar no portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('shop')}
                  className="klasse-auth-back-btn"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar ao Catálogo da Loja</span>
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`laurinita-app ${isDarkMode ? 'dark' : ''}`}>
      {/* Toast Notification */}
      {notice && (
        <div className="toast-notification toast-success" role="status">
          <CheckCircle2 size={18} className="toast-icon toast-icon-success" />
          <span className="toast-text">{notice}</span>
          <button onClick={() => setNotice('')} className="toast-close-btn" aria-label="Fechar">
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="toast-notification toast-error" role="alert">
          <AlertCircle size={18} className="toast-icon toast-icon-error" />
          <span className="toast-text">{error}</span>
          <button onClick={() => setError('')} className="toast-close-btn" aria-label="Fechar">
            <X size={15} />
          </button>
        </div>
      )}


      {/* ========================================================================= */}
      {/* 2. MAIN HEADER (EXACT OBOTICÁRIO / RACHI E-COMMERCE HEADER)               */}
      {/* ========================================================================= */}
      <header className="store-main-header">
        <div className="main-header-container">
          {/* Brand Logo & Title */}
          <div className="store-brand-link" onClick={() => navigateTo('shop')} role="button" tabIndex={0}>
            <img
              src={STORE_INFO.logoUrl}
              alt="Laurinita"
              className="store-brand-logo-img"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="store-brand-titles">
              <span className="store-brand-name">LAURINITA</span>
              <span className="store-brand-badge">Distribuidora Ltda</span>
            </div>
          </div>

          {/* Search Pill Input */}
          <div className="store-search-container">
            <input
              type="search"
              placeholder="Buscar 80 equipamentos médicos e hospitalares..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="store-search-pill"
            />
            <button
              type="button"
              className="store-search-action-btn"
              title="Buscar equipamentos"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Header Action Icons */}
          <div className="store-header-actions">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              className="store-action-btn"
              onClick={toggleTheme}
              title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {isDarkMode ? <Sun size={18} color="#f5a800" /> : <Moon size={18} />}
            </button>

            {/* User Account Popover */}
            <div className="store-user-menu-wrap">
              <button
                type="button"
                className="store-user-btn"
                onClick={() => {
                  if (!currentUser) {
                    navigateTo('login');
                  } else {
                    setUserMenuOpen(!userMenuOpen);
                  }
                }}
              >
                <div className="user-avatar-circle">
                  {currentUser ? currentUser.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="user-btn-text">
                  <div className="user-btn-name">
                    {currentUser ? `Olá, ${currentUser.name.split(' ')[0]}` : 'Entrar no Sistema'}
                  </div>
                </div>
                <ChevronDown size={12} color="#94a3b8" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1040 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="store-user-popover" style={{ zIndex: 1050 }}>
                    {currentUser ? (
                      <div>
                        <div className="user-popover-profile">
                          <div className="user-avatar-circle" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
                            {currentUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="user-popover-info">
                            <b>{currentUser.name}</b>
                            <span>{currentUser.email}</span>
                            <span
                              className="user-popover-badge"
                              style={{
                                backgroundColor: ROLE_PERMISSIONS[currentUser.role]?.color || '#071326',
                                color: '#ffffff'
                              }}
                            >
                              {ROLE_PERMISSIONS[currentUser.role]?.badgeLabel}
                            </span>
                          </div>
                        </div>

                        <hr style={{ margin: '12px 0', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />

                        {['admin', 'manager', 'operator'].includes(currentUser.role) && (
                          <button
                            type="button"
                            className="popover-item"
                            style={{ fontWeight: 800, color: '#f5a800', marginBottom: 4 }}
                            onClick={() => { navigateTo('admin'); setUserMenuOpen(false); }}
                          >
                            <LayoutDashboard size={15} />
                            <span>Dashboard</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="popover-item"
                          style={{ color: '#e11d48', fontWeight: 700 }}
                          onClick={handleLogout}
                        >
                          <LogOut size={15} />
                          <span>Terminar Sessão</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.78rem', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: 12, lineHeight: 1.45 }}>
                          Aceda para emitir faturas, gerir o catálogo de 80 produtos e aceder ao dashboard.
                        </p>
                        <button
                          type="button"
                          className="btn-comprar"
                          onClick={() => { navigateTo('login'); setUserMenuOpen(false); }}
                        >
                          <LogIn size={15} />
                          <span>Entrar no Sistema</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sacola de Compras Button */}
            <button
              type="button"
              className="store-cart-btn"
              onClick={() => setCartDrawerOpen(true)}
              title="Ver Sacola de Compras"
            >
              <div className="cart-icon-box">
                <ShoppingBag size={18} className="cart-btn-icon" />
                {cartCount > 0 && <span className="cart-badge-counter">{cartCount}</span>}
              </div>
              <span className="cart-btn-price">
                {formatKwanzas(cartSubtotal)}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. HORIZONTAL CATEGORY BAR WITH < > SCROLL BUTTONS                       */}
        {/* ========================================================================= */}
        {view === 'shop' && (
          <div className="store-cat-bar">
            <div className="cat-bar-container">
              <button
                type="button"
                className="cat-scroll-arrow-btn"
                onClick={() => categoryScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                title="Rolar categorias à esquerda"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="cat-scroll-track no-scrollbar" ref={categoryScrollRef}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-nav-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'Todos' && <span style={{ color: '#f5a800' }}>⚡</span>}
                    {cat === 'UTI & Cuidados Intensivos' && <span style={{ color: '#e11d48' }}>❤️</span>}
                    {cat === 'Mobiliário Hospitalar' && <span>🛏️</span>}
                    {cat === 'Diagnóstico & Imagiologia' && <span style={{ color: '#00a3e0' }}>🔬</span>}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="cat-scroll-arrow-btn"
                onClick={() => categoryScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                title="Rolar categorias à direita"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN VIEW CONTENT: SHOPPING OR ADMIN DASHBOARD */}
      {view === 'shop' ? (
        <main style={{ flex: 1 }}>
          {/* ========================================================================= */}
          {/* 4. HERO BANNER CAROUSEL (RÉPLICA FIEL RACHI.AO)                           */}
          {/* ========================================================================= */}
          <section className="boti-hero-carousel">
            <div className="hero-carousel-container">
              {/* Carousel Slides */}
              {heroSlides.map((slide, idx) => (
                idx === currentSlide && (
                  <div key={idx} className="carousel-slide-content">
                    {/* Left details */}
                    <div className="hero-slide-text">
                      <span className="hero-kicker-pill" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                        {slide.kicker}
                      </span>
                      <h1 className="hero-slide-title">
                        {slide.title}<br />
                        <span>{slide.titleHighlight}</span>
                      </h1>
                      <p className="hero-slide-desc">
                        <span className="hero-desc-desktop">{slide.desc} Faturação oficial em Luanda por <strong>{slide.price}</strong>.</span>
                        <span className="hero-desc-mobile">{slide.shortDesc}</span>
                      </p>
                      <div>
                        <button
                          type="button"
                          className="hero-cta-btn"
                          onClick={() => {
                            setSelectedCategory(slide.category);
                            setNotice(`Filtro "${slide.category}" ativado.`);
                          }}
                        >
                          <span>Ver no Catálogo</span>
                          <span className="hero-cta-price-tag">{slide.price}</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Right transparent showcase pod - MODELO PRINT 1 */}
                    <div className="hero-showcase-wrapper">
                      {/* Decorative Shape 1: Bloco Amarelo/Dourado no topo esquerdo */}
                      <div className="hero-decor-shape-gold" />

                      {/* Decorative Shape 2: Bloco Cinza Neutro no canto inferior direito */}
                      <div className="hero-decor-shape-grey" />

                      <div
                        className="hero-showcase-card"
                        onClick={() => {
                          const prod = products.find((p) => p.category === slide.category || p.name.toLowerCase().includes(slide.title.toLowerCase()));
                          if (prod) setDetailProduct(prod);
                        }}
                      >
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="hero-showcase-img"
                        />
                      </div>
                    </div>
                  </div>
                )
              ))}

              {/* Arrow navigation buttons < and > (estilo Print 1) */}
              <button
                type="button"
                className="hero-nav-arrow left"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)}
                aria-label="Slide anterior"
              >
                <ChevronLeft size={22} color="#059669" />
              </button>

              <button
                type="button"
                className="hero-nav-arrow right"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % totalSlides)}
                aria-label="Próximo slide"
              >
                <ChevronRight size={22} color="#059669" />
              </button>

              {/* Floating WhatsApp buy button */}
              <a
                href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=Olá!%20Gostaria%20de%20solicitar%20cotação%20de%20equipamentos%20hospitalares.`}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-whatsapp-float"
              >
                <MessageCircle size={16} />
                <span>Compre pelo WhatsApp</span>
              </a>
            </div>

            {/* Dots indicator */}
            <div className="hero-dots-row">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`hero-dot ${currentSlide === idx ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </section>




          {/* ========================================================================= */}
          {/* 7. VITRINE PRINCIPAL DE PRODUTOS (BOTI-CARDS ESTILO BOTICÁRIO / RACHI)   */}
          {/* ========================================================================= */}
          <section className="catalog-vitrine-section" id="catalogo">
            <div className="vitrine-header-row">
              <div className="vitrine-header-titles">
                <span className="kicker">{selectedCategory}</span>
                <h2>Catálogo de Equipamentos Hospitalares</h2>
                <p>Equipamentos certificados a pronta entrega com preços transparentes em Kwanzas (AOA).</p>
              </div>

              <div className="vitrine-controls">
                <span className="vitrine-counter">
                  <b>{filteredProducts.length}</b> equipamentos disponíveis
                </span>

                <select
                  className="vitrine-select-sort"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                >
                  <option value="relevance">Mais Relevantes</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                  <option value="name">Nome (A–Z)</option>
                </select>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="store-action-btn"
                    style={{ width: 34, height: 34 }}
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    title="Alternar modo de grelha"
                  >
                    {viewMode === 'grid' ? <ListIcon size={16} /> : <Grid3X3 size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Filter Chips (Todos, Em Estoque Imediato, Com Desconto, Limpar) */}
            <div className="vitrine-filter-chips-row">
              <button
                type="button"
                className={`filter-chip ${selectedCategory === 'Todos' && !onlyAvailable && !onlyDiscount && !searchQuery ? 'active' : ''}`}
                onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); setOnlyAvailable(false); setOnlyDiscount(false); }}
              >
                <span>⚡ Todos ({products.length})</span>
              </button>

              <button
                type="button"
                className={`filter-chip ${onlyAvailable ? 'active' : ''}`}
                onClick={() => setOnlyAvailable(!onlyAvailable)}
              >
                <Check size={13} />
                <span>Em Estoque Imediato</span>
              </button>

              <button
                type="button"
                className={`filter-chip ${onlyDiscount ? 'active' : ''}`}
                onClick={() => setOnlyDiscount(!onlyDiscount)}
              >
                <BadgePercent size={13} />
                <span>Com Desconto</span>
              </button>

              {(selectedCategory !== 'Todos' || searchQuery || onlyAvailable || onlyDiscount) && (
                <button
                  type="button"
                  className="filter-chip-clear"
                  onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); setOnlyAvailable(false); setOnlyDiscount(false); }}
                  title="Limpar todos os filtros ativos"
                >
                  <X size={12} />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: 24, border: '1px solid #e2e8f0' }}>
                <Package size={48} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Nenhum equipamento encontrado</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                  Tente limpar a pesquisa ou selecionar outra categoria.
                </p>
                <button
                  type="button"
                  className="btn-comprar"
                  style={{ width: 'auto', display: 'inline-flex', marginTop: 16 }}
                  onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); setOnlyAvailable(false); setOnlyDiscount(false); }}
                >
                  Ver Todos os 80 Equipamentos
                </button>
              </div>
            ) : (
              <div className="products-boti-grid">
                {paginatedShopProducts.map((p) => {
                  const isFav = favorites.includes(p.id);
                  const isAvailable = p.isAvailable && p.stock > 0;

                  return (
                    <article key={p.id} className="boti-card">
                      {/* Image Pod */}
                      <div className="product-image-pod" onClick={() => setDetailProduct(p)}>
                        {p.discount && p.discount > 0 ? (
                          <div className="product-badges-corner">
                            <span className="product-discount-pill">-{p.discount}% OFF</span>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className={`product-favorite-btn ${isFav ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                          title={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                        >
                          <Heart size={16} fill={isFav ? '#e11d48' : 'none'} />
                        </button>

                        <img
                          src={p.image}
                          alt={p.name}
                          className="product-cutout-img"
                          loading="lazy"
                        />
                      </div>

                      {/* Card Body */}
                      <div className="boti-card-body">
                        <div>
                          <h3 className="boti-product-title" onClick={() => setDetailProduct(p)} title={p.name}>
                            {p.name}
                          </h3>

                          <p className="boti-product-desc">
                            {p.technicalSpecs || 'Equipamento hospitalar certificado com suporte técnico e calibração oficial.'}
                          </p>
                        </div>

                        <div>
                          {/* Pricing */}
                          <div className="boti-card-pricing">
                            {p.discount && p.discount > 0 && (
                              <span className="price-old">
                                De {formatKwanzas(Math.round(p.price * (1 + p.discount / 100)))}
                              </span>
                            )}
                            <div className="price-current-row">
                              <span className="price-label">Por:</span>
                              <strong className="price-amount">{formatKwanzas(p.price)}</strong>
                            </div>
                          </div>

                          {/* Actions */}
                          <button
                            type="button"
                            className="btn-comprar"
                            onClick={() => handleStartOrder(p)}
                          >
                            <ShoppingBag size={15} />
                            <span>Fazer Pedido</span>
                          </button>

                          <button
                            type="button"
                            className={`btn-adicionar-sacola ${cart[p.id] ? 'in-cart' : ''}`}
                            onClick={() => addToCart(p)}
                          >
                            {cart[p.id] ? <Check size={14} /> : <Plus size={14} />}
                            <span>{cart[p.id] ? `Na Sacola (${cart[p.id]})` : 'Adicionar à Sacola'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Shop Pagination Toolbar */}
            {filteredProducts.length > 0 && (
              <div
                className="admin-pagination-bar"
                style={{
                  marginTop: 24,
                  borderRadius: 18,
                  backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div className="admin-pagination-left">
                  <span className="admin-pagination-label">Linhas por página:</span>
                  <div className="admin-pagination-select-wrap">
                    <select
                      className="admin-pagination-select"
                      value={shopRowsPerPage}
                      onChange={(e) => setShopRowsPerPage(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="admin-pagination-range">
                  {startShopItem}–{endShopItem} de {filteredProducts.length}
                </div>

                <div className="admin-pagination-nav">
                  <button
                    type="button"
                    className="admin-page-nav-btn"
                    onClick={() => {
                      setShopPage(1);
                      const el = document.getElementById('catalogo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={shopPage <= 1}
                    title="Primeira página"
                    aria-label="Primeira página"
                  >
                    <ChevronFirst size={18} />
                  </button>
                  <button
                    type="button"
                    className="admin-page-nav-btn"
                    onClick={() => {
                      setShopPage((prev) => Math.max(1, prev - 1));
                      const el = document.getElementById('catalogo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={shopPage <= 1}
                    title="Página anterior"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="admin-page-nav-btn"
                    onClick={() => {
                      setShopPage((prev) => Math.min(totalShopPages, prev + 1));
                      const el = document.getElementById('catalogo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={shopPage >= totalShopPages}
                    title="Próxima página"
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    type="button"
                    className="admin-page-nav-btn"
                    onClick={() => {
                      setShopPage(totalShopPages);
                      const el = document.getElementById('catalogo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={shopPage >= totalShopPages}
                    title="Última página"
                    aria-label="Última página"
                  >
                    <ChevronLast size={18} />
                  </button>
                </div>
              </div>
            )}
          </section>

        </main>
      ) : (
        /* ========================================================================= */
        /* ADMIN DASHBOARD VIEW (RBAC GUARDED WITH STAFF ROLES)                      */
        /* ========================================================================= */
        <main style={{ flex: 1, backgroundColor: isDarkMode ? '#040b17' : '#f8fafc' }}>
          {!currentUser || !['admin', 'manager', 'operator'].includes(currentUser.role) ? (
            /* ACCESS GUARD SCREEN */
            <div className="admin-access-guard-screen">
              <div className="access-guard-card">
                <div className="guard-shield-header">
                  <div className="guard-shield-icon-wrap" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#fef3c7', color: '#d97706' }}>
                    <Lock size={36} />
                  </div>
                  <h2>Entrar no Sistema</h2>
                  <p>
                    Acesso exclusivo ao Painel de Gestão da Laurinita Distribuidora Ltda. Insira as suas credenciais corporativas para continuar:
                  </p>
                </div>

                {loginError && (
                  <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin}>
                  <div className="form-field-group">
                    <label className="form-field-label">Email Corporativo</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="form-field-input"
                      required
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Palavra-passe</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="form-field-input"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button type="submit" className="btn-comprar" style={{ flex: 1 }} disabled={loginLoading}>
                      <Key size={16} />
                      <span>{loginLoading ? 'A autenticar...' : 'Entrar no Sistema'}</span>
                    </button>
                    <button
                      type="button"
                      style={{ padding: '10px 18px', background: 'none', border: '1px solid #cbd5e1', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => navigateTo('shop')}
                    >
                      Voltar à Loja
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED ADMIN DASHBOARD */
            <div>
              {/* Admin Tabs Bar */}
              <div className="admin-tabs-wrapper">
                <div className="admin-tabs-container">
                  <div className="admin-tabs-list">
                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setAdminTab('overview')}
                    >
                      <LayoutDashboard size={16} />
                      <span>Visão Geral</span>
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'products' ? 'active' : ''}`}
                      onClick={() => setAdminTab('products')}
                    >
                      <Package size={16} />
                      <span>Produtos</span>
                      <span className="admin-tab-badge">{products.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'orders' ? 'active' : ''}`}
                      onClick={() => setAdminTab('orders')}
                    >
                      <ClipboardList size={16} />
                      <span>Encomendas</span>
                      <span className="admin-tab-badge">{orders.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'stock' ? 'active' : ''}`}
                      onClick={() => setAdminTab('stock')}
                    >
                      <Activity size={16} />
                      <span>Estoque & Auditoria</span>
                      {lowStockProducts.length > 0 && (
                        <span className="admin-tab-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          {lowStockProducts.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="admin-back-btn"
                    onClick={() => navigateTo('shop')}
                  >
                    <ArrowLeft size={15} />
                    <span>Voltar à Loja</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="admin-dashboard-container">
                <div className="admin-dashboard-header-row">
                  <div>
                    <h2 className="admin-dashboard-title">
                      Painel de Gestão
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="btn-comprar admin-sync-btn"
                    onClick={() => {
                      fetchDbData();
                      setNotice('Dados sincronizados com o banco de dados!');
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Sincronizar Banco</span>
                  </button>
                </div>

                {/* Dashboard Metrics - 4 Responsive Interactive Filter Cards */}
                <div className="admin-metrics-grid">
                  <div
                    className={`admin-metric-card clickable ${adminTab === 'products' ? 'active-metric' : ''}`}
                    onClick={() => {
                      setAdminTab('products');
                      setAdminCategory('Todos');
                      setAdminSearch('');
                    }}
                    role="button"
                    tabIndex={0}
                    title="Clique para filtrar e ver todos os equipamentos"
                  >
                    <div className="admin-metric-card-top">
                      <span className="admin-metric-label">
                        Equipamentos
                      </span>
                      <div className="admin-metric-icon-wrap" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                        <Package size={16} />
                      </div>
                    </div>
                    <h3 className="admin-metric-num" style={{ color: '#f5a800' }}>{products.length}</h3>
                    <span className="admin-metric-desc" style={{ color: '#10b981' }}>
                      Filtrar no banco →
                    </span>
                  </div>

                  <div
                    className={`admin-metric-card clickable ${adminTab === 'stock' ? 'active-metric' : ''}`}
                    onClick={() => setAdminTab('stock')}
                    role="button"
                    tabIndex={0}
                    title="Clique para ver auditoria e saldo de estoque"
                  >
                    <div className="admin-metric-card-top">
                      <span className="admin-metric-label">
                        Total em Estoque
                      </span>
                      <div className="admin-metric-icon-wrap" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        <Activity size={16} />
                      </div>
                    </div>
                    <h3 className="admin-metric-num" style={{ color: '#059669' }}>{totalInventoryUnits} un.</h3>
                    <span className="admin-metric-desc">
                      Auditoria de estoque →
                    </span>
                  </div>

                  <div
                    className={`admin-metric-card clickable ${adminTab === 'orders' ? 'active-metric' : ''}`}
                    onClick={() => setAdminTab('orders')}
                    role="button"
                    tabIndex={0}
                    title="Clique para filtrar encomendas"
                  >
                    <div className="admin-metric-card-top">
                      <span className="admin-metric-label">
                        Encomendas
                      </span>
                      <div className="admin-metric-icon-wrap" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                        <ClipboardList size={16} />
                      </div>
                    </div>
                    <h3 className="admin-metric-num" style={{ color: '#0284c7' }}>{orders.length}</h3>
                    <span className="admin-metric-desc">
                      Ver encomendas →
                    </span>
                  </div>

                  <div
                    className={`admin-metric-card clickable ${adminTab === 'orders' ? 'active-metric' : ''}`}
                    onClick={() => setAdminTab('orders')}
                    role="button"
                    tabIndex={0}
                    title="Clique para ver relatórios financeiros"
                  >
                    <div className="admin-metric-card-top">
                      <span className="admin-metric-label">
                        Volume Total
                      </span>
                      <div className="admin-metric-icon-wrap" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                        <FileText size={16} />
                      </div>
                    </div>
                    <h3 className="admin-metric-num admin-metric-num-currency" style={{ color: '#10b981' }}>
                      {formatKwanzas(orders.reduce((acc, o) => acc + o.total, 0))}
                    </h3>
                    <span className="admin-metric-desc">
                      Relatório comercial →
                    </span>
                  </div>
                </div>

                {/* 1. ABA: VISÃO GERAL */}
                {adminTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Quick Action Toolbar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={18} color="#f5a800" />
                        <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Ações Rápidas de Gestão</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (products.length > 0) {
                              setStockModalProduct(products[0]);
                              setStockMovementType('Entrada');
                              setStockDelta(5);
                            }
                          }}
                          style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: '#0f766e', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Plus size={14} />
                          <span>+ Entrada de Estoque</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewProductModalOpen(true)}
                          style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: '#071326', color: '#f5a800', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Package size={14} />
                          <span>+ Cadastrar Equipamento</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAdminTab('orders')}
                          style={{ padding: '8px 14px', borderRadius: 10, backgroundColor: isDarkMode ? '#061124' : '#f1f5f9', color: isDarkMode ? '#ffffff' : '#0f172a', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <ClipboardList size={14} />
                          <span>Gerenciar Encomendas ({orders.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Low Stock Alert Section */}
                    {lowStockProducts.length > 0 && (
                      <div style={{ backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', borderRadius: 18, border: '1px solid #fecaca', padding: 20, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)' }}>
                        <div className="admin-alert-header">
                          <div className="admin-alert-header-info">
                            <div className="admin-alert-icon-box">
                              <AlertTriangle size={18} />
                            </div>
                            <div>
                              <h4 className="admin-alert-title">
                                Alerta de Estoque Crítico ({lowStockProducts.length} itens)
                              </h4>
                              <p className="admin-alert-subtitle">Equipamentos com estoque igual ou abaixo da reserva mínima.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdminTab('products')}
                            className="admin-alert-link-btn"
                          >
                            Ver todos no catálogo →
                          </button>
                        </div>

                        {/* Mobile Optimized Cards (< 640px) */}
                        <div className="admin-lowstock-mobile-cards admin-mobile-only">
                          {lowStockProducts.slice(0, 5).map((p) => (
                            <div key={p.id} className="admin-lowstock-card">
                              <div className="admin-lowstock-card-top">
                                <span className="admin-lowstock-name">{p.name}</span>
                                <span className={`admin-stock-pill ${p.stock === 0 ? 'out' : 'low'}`}>
                                  {p.stock === 0 ? '0 un. (Esgotado)' : `${p.stock} un.`}
                                </span>
                              </div>
                              <div className="admin-lowstock-card-meta">
                                <span><b>Cat:</b> {p.category}</span>
                                <span><b>Mínimo:</b> {p.minimum || 1} un.</span>
                              </div>
                              <div className="admin-lowstock-card-actions">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStock(p.id, 1)}
                                  className="admin-quick-add-btn"
                                  title="Adicionar 1 unidade imediatamente no banco"
                                >
                                  +1 un. Entrada
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStockModalProduct(p);
                                    setStockMovementType('Entrada');
                                    setStockDelta(5);
                                  }}
                                  className="admin-repor-lote-btn"
                                >
                                  Repor Lote
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop / Tablet Table (>= 641px) */}
                        <div className="admin-table-scroll-container admin-desktop-only">
                          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px' }}>Equipamento</th>
                                <th style={{ padding: '8px 10px' }}>Categoria</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Saldo Atual</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Mínimo</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Reposição Rápida</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lowStockProducts.slice(0, 5).map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px', fontWeight: 700 }}>{p.name}</td>
                                  <td style={{ padding: '10px', color: '#64748b' }}>{p.category}</td>
                                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                    <span className={`admin-stock-pill ${p.stock === 0 ? 'out' : 'low'}`}>
                                      {p.stock} un.
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{p.minimum || 1} un.</td>
                                  <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'inline-flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickStock(p.id, 1)}
                                        className="admin-quick-add-btn compact"
                                        title="Adicionar 1 unidade imediatamente no banco"
                                      >
                                        +1 un.
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStockModalProduct(p);
                                          setStockMovementType('Entrada');
                                          setStockDelta(5);
                                        }}
                                        className="admin-repor-lote-btn compact"
                                      >
                                        Repor Lote
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders Overview */}
                    <div style={{ backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 20 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0 }}>Últimas Encomendas Recebidas ({orders.length})</h4>
                        <button
                          type="button"
                          onClick={() => setAdminTab('orders')}
                          className="admin-alert-link-btn"
                        >
                          Ver todas as encomendas →
                        </button>
                      </div>

                      {orders.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>Nenhuma encomenda registada no banco até o momento.</p>
                      ) : (
                        <div className="admin-table-scroll-container">
                          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Código</th>
                                <th style={{ padding: '8px 10px' }}>Cliente</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Total (AOA)</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orders.slice(0, 5).map((ord: any) => (
                                <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>#{ord.id}</td>
                                  <td style={{ padding: '10px' }}>{ord.customer || ord.customerName}</td>
                                  <td style={{ padding: '10px', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>{formatKwanzas(ord.total)}</td>
                                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 800, backgroundColor: ord.status === 'Entregue' ? '#ecfdf5' : ord.status === 'Cancelado' ? '#fee2e2' : '#fef3c7', color: ord.status === 'Entregue' ? '#059669' : ord.status === 'Cancelado' ? '#dc2626' : '#d97706', whiteSpace: 'nowrap' }}>
                                      {ord.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ABA: PRODUTOS & CONTROLE RÁPIDO DE ESTOQUE (+/-) */}
                {adminTab === 'products' && (
                  <div style={{ backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 20 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Gestão de Equipamentos ({filteredAdminProducts.length} de {products.length})</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Ajuste o estoque em tempo real com 1 clique (+ / -) ou cadastre novos itens.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNewProductModalOpen(true)}
                        style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: '#071326', color: '#f5a800', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus size={15} />
                        <span>Novo Equipamento</span>
                      </button>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Pesquisar por equipamento ou categoria..."
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: isDarkMode ? '#061124' : '#f8fafc', color: isDarkMode ? '#ffffff' : '#071326' }}
                        />
                        <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
                        {adminSearch && (
                          <button
                            type="button"
                            onClick={() => setAdminSearch('')}
                            style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <select
                        value={adminCategory}
                        onChange={(e) => setAdminCategory(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: isDarkMode ? '#061124' : '#f8fafc', color: isDarkMode ? '#ffffff' : '#071326' }}
                      >
                        {adminCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Mobile Products Cards (< 640px) */}
                    <div className="admin-products-mobile-list admin-mobile-only" style={{ marginBottom: 16 }}>
                      {paginatedAdminProducts.map((prod) => (
                        <div key={prod.id} className="admin-product-mobile-card">
                          <div className="admin-product-mobile-card-header">
                            <img
                              src={prod.image || prod.imageUrl || '/products/monitor-uti.png'}
                              alt={prod.name}
                              className="admin-product-mobile-thumb"
                            />
                            <div className="admin-product-mobile-info">
                              <div className="admin-product-mobile-title">{prod.name}</div>
                              <div className="admin-product-mobile-price">{formatKwanzas(prod.price)}</div>
                            </div>
                          </div>

                          <div className="admin-product-mobile-row2">
                            <span className="admin-product-mobile-cat">{prod.category}</span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: isDarkMode ? '#0b172a' : '#f8fafc', padding: '3px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                              <button
                                type="button"
                                onClick={() => handleQuickStock(prod.id, -1)}
                                disabled={prod.stock <= 0}
                                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', cursor: prod.stock > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', opacity: prod.stock <= 0 ? 0.35 : 1 }}
                                title="Diminuir 1 un."
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 900, fontSize: '0.85rem', minWidth: 26, textAlign: 'center', color: prod.stock === 0 ? '#dc2626' : isDarkMode ? '#f8fafc' : '#071326' }}>
                                {prod.stock} un.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickStock(prod.id, 1)}
                                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', backgroundColor: '#ecfdf5', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}
                                title="Aumentar 1 un."
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="admin-product-mobile-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setStockModalProduct(prod);
                                setStockMovementType('Entrada');
                                setStockDelta(5);
                              }}
                              className="admin-repor-lote-btn"
                              style={{ padding: '8px 10px', fontSize: '0.74rem' }}
                            >
                              Ajustar Lote
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailProduct(prod)}
                              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', backgroundColor: isDarkMode ? '#061124' : '#ffffff', color: isDarkMode ? '#cbd5e1' : '#0f172a', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700 }}
                            >
                              Ver Loja
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Products Table with Quick Stock Adjust (>= 641px) */}
                    <div className="admin-table-scroll-container admin-desktop-only">
                      <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                            <th style={{ padding: '10px 12px' }}>Equipamento</th>
                            <th style={{ padding: '10px 12px' }}>Categoria</th>
                            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Preço Unitário</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Estoque em Banco</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>Ações Rápidas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAdminProducts.map((prod) => (
                            <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <img
                                    src={prod.image || prod.imageUrl || '/products/monitor-uti.png'}
                                    alt={prod.name}
                                    style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, backgroundColor: '#f8fafc', padding: 3, border: '1px solid #e2e8f0', flexShrink: 0 }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 700, lineHeight: 1.25, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>{prod.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>ID: {prod.id.slice(0, 10)}...</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>{prod.category}</td>
                              <td style={{ padding: '12px', fontWeight: 800, color: '#f5a800', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatKwanzas(prod.price)}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: isDarkMode ? '#061124' : '#ffffff', padding: '4px 10px', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStock(prod.id, -1)}
                                    disabled={prod.stock <= 0}
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', cursor: prod.stock > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem', opacity: prod.stock <= 0 ? 0.35 : 1, transition: 'all 0.15s ease' }}
                                    title="Diminuir 1 un. (Saída no banco)"
                                  >
                                    -
                                  </button>
                                  <span style={{ fontWeight: 900, fontSize: '0.88rem', minWidth: 26, textAlign: 'center', color: prod.stock === 0 ? '#dc2626' : isDarkMode ? '#f8fafc' : '#071326' }}>
                                    {prod.stock}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStock(prod.id, 1)}
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', backgroundColor: '#ecfdf5', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem', transition: 'all 0.15s ease' }}
                                    title="Aumentar 1 un. (Entrada no banco)"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStockModalProduct(prod);
                                      setStockMovementType('Entrada');
                                      setStockDelta(5);
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: '#071326', color: '#f5a800', border: 'none', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800, whiteSpace: 'nowrap', transition: 'transform 0.15s ease' }}
                                  >
                                    Ajustar Lote
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailProduct(prod)}
                                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', backgroundColor: isDarkMode ? '#061124' : '#ffffff', color: isDarkMode ? '#cbd5e1' : '#0f172a', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background-color 0.15s ease' }}
                                  >
                                    Ver Loja
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Toolbar matching exact specification */}
                    <div className="admin-pagination-bar">
                      <div className="admin-pagination-left">
                        <span className="admin-pagination-label">Linhas por página:</span>
                        <select
                          className="admin-pagination-select"
                          value={adminRowsPerPage}
                          onChange={(e) => setAdminRowsPerPage(Number(e.target.value))}
                        >
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      <div className="admin-pagination-range">
                        {startAdminItem}–{endAdminItem} de {filteredAdminProducts.length}
                      </div>

                      <div className="admin-pagination-nav">
                        <button
                          type="button"
                          className="admin-page-nav-btn"
                          onClick={() => setAdminPage(1)}
                          disabled={adminPage <= 1}
                          title="Primeira página"
                          aria-label="Primeira página"
                        >
                          <ChevronFirst size={18} />
                        </button>
                        <button
                          type="button"
                          className="admin-page-nav-btn"
                          onClick={() => setAdminPage((prev) => Math.max(1, prev - 1))}
                          disabled={adminPage <= 1}
                          title="Página anterior"
                          aria-label="Página anterior"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          className="admin-page-nav-btn"
                          onClick={() => setAdminPage((prev) => Math.min(totalAdminPages, prev + 1))}
                          disabled={adminPage >= totalAdminPages}
                          title="Próxima página"
                          aria-label="Próxima página"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button
                          type="button"
                          className="admin-page-nav-btn"
                          onClick={() => setAdminPage(totalAdminPages)}
                          disabled={adminPage >= totalAdminPages}
                          title="Última página"
                          aria-label="Última página"
                        >
                          <ChevronLast size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ABA: ESTOQUE & AUDITORIA (LEDGER EM BANCO D1) */}
                {adminTab === 'stock' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Header bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', padding: 20, borderRadius: 18, border: '1px solid #e2e8f0' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 900 }}>Auditoria de Estoque & Histórico de Movimentações</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Livro-razão (ledger) com persistência atômica de entradas, saídas e vendas registadas no banco.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (products.length > 0) {
                            setStockModalProduct(products[0]);
                            setStockMovementType('Entrada');
                            setStockDelta(10);
                          }
                        }}
                        style={{ padding: '8px 16px', borderRadius: 10, backgroundColor: '#0f766e', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus size={15} />
                        <span>+ Nova Movimentação Manual</span>
                      </button>
                    </div>

                    {/* Stock Movements Ledger Table */}
                    <div style={{ backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 20 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: 14 }}>Últimos Registros de Movimentação ({stockMovements.length})</h4>
                      {stockMovements.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>Nenhuma movimentação manual ou venda registada ainda no banco.</p>
                      ) : (
                        <div className="admin-table-scroll-container">
                          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Data / Hora</th>
                                <th style={{ padding: '8px 10px' }}>Equipamento</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Variação</th>
                                <th style={{ padding: '8px 10px' }}>Motivo</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Operador</th>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Ref / Pedido</th>
                              </tr>
                            </thead>
                          <tbody>
                            {stockMovements.map((mov: any) => (
                              <tr key={mov.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {mov.created ? new Date(mov.created).toLocaleString('pt-AO') : '—'}
                                </td>
                                <td style={{ padding: '10px', fontWeight: 700 }}>
                                  {mov.name || (products.find((p) => p.id === mov.product_id)?.name || mov.product_id)}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 10, fontWeight: 900, fontSize: '0.75rem', backgroundColor: mov.delta > 0 ? '#ecfdf5' : '#fee2e2', color: mov.delta > 0 ? '#059669' : '#dc2626' }}>
                                    {mov.delta > 0 ? `+${mov.delta}` : mov.delta} un.
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: isDarkMode ? '#cbd5e1' : '#334155' }}>{mov.reason}</td>
                                <td style={{ padding: '10px', color: '#64748b', fontSize: '0.72rem' }}>{mov.actor}</td>
                                <td style={{ padding: '10px', color: '#0284c7', fontSize: '0.72rem', fontWeight: 700 }}>
                                  {mov.order_id ? `#${mov.order_id}` : 'Manual'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

                {/* 4. ABA: ENCOMENDAS & GESTÃO DE FATURAS */}
                {adminTab === 'orders' && (
                  <div style={{ backgroundColor: isDarkMode ? '#0d1e38' : '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 20 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 900 }}>Gestão de Encomendas & Proformas ({orders.length})</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Atualize o status dos pedidos em tempo real. O cancelamento repõe o estoque automaticamente no banco.</p>
                      </div>

                      <button
                        type="button"
                        onClick={fetchDbData}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <RefreshCw size={14} />
                        <span>Atualizar Lista</span>
                      </button>
                    </div>

                    {orders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        <ClipboardList size={36} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
                        <h4 style={{ fontWeight: 800 }}>Nenhuma encomenda registada</h4>
                        <p style={{ fontSize: '0.8rem' }}>As encomendas emitidas na loja aparecerão listadas aqui para controle fiscal e logístico.</p>
                      </div>
                    ) : (
                      <div className="admin-table-scroll-container">
                        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Nº Encomenda</th>
                              <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Data / Hora</th>
                              <th style={{ padding: '10px 12px' }}>Cliente / Clínica</th>
                              <th style={{ padding: '10px 12px' }}>Destino</th>
                              <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Valor Total</th>
                              <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Status Atual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((ord: any) => (
                              <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px', fontWeight: 900, color: '#0284c7' }}>
                                  #{ord.id}
                                </td>
                                <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {ord.created ? new Date(ord.created).toLocaleDateString('pt-AO') : ord.createdAt || 'Hoje'}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 700 }}>
                                  {ord.customer || ord.customerName}
                                </td>
                                <td style={{ padding: '12px', color: '#64748b', fontSize: '0.75rem' }}>
                                  {ord.address || ord.deliveryAddress || 'Luanda'}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 800, color: '#10b981' }}>
                                  {formatKwanzas(ord.total)}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <select
                                    value={ord.status}
                                    onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 8,
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      border: '1px solid #cbd5e1',
                                      backgroundColor: ord.status === 'Entregue' ? '#ecfdf5' : ord.status === 'Cancelado' ? '#fee2e2' : ord.status === 'Em Preparação' ? '#eff6ff' : '#fef3c7',
                                      color: ord.status === 'Entregue' ? '#059669' : ord.status === 'Cancelado' ? '#dc2626' : ord.status === 'Em Preparação' ? '#1d4ed8' : '#d97706',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                                    <option value="Em Preparação">Em Preparação</option>
                                    <option value="Enviado">Enviado</option>
                                    <option value="Entregue">Entregue</option>
                                    <option value="Cancelado">Cancelado</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* 9. SLIDING CART DRAWER (SACOLA LATERAL — MODELO BOTICÁRIO / RACHI)       */}
      {/* ========================================================================= */}
      {cartDrawerOpen && (
        <div className="cart-backdrop" onClick={() => setCartDrawerOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cart-drawer-header">
              <div className="cart-drawer-title-box">
                <ShoppingBag size={20} color="#f5a800" />
                <h3>Minha Sacola de Compras</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, backgroundColor: '#fef3c7', color: '#92400e' }}>
                  {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <button
                type="button"
                className="cart-close-btn"
                onClick={() => setCartDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Items List */}
            <div className="cart-items-scroll">
              {cartLines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <ShoppingBag size={48} style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#071326' }}>A sua sacola está vazia</p>
                  <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Adicione equipamentos hospitalares para emitir a sua fatura proforma.</p>
                </div>
              ) : (
                cartLines.map(({ product, quantity, lineTotal }) => (
                  <div key={product.id} className="cart-item-card">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="cart-item-thumb"
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{product.name}</div>
                      <div className="cart-item-price">{formatKwanzas(product.price)}</div>
                      <div className="cart-qty-stepper">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          -
                        </button>
                        <span className="cart-qty-val">{quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-item-delete-btn"
                      onClick={() => updateQuantity(product.id, -quantity)}
                      title="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer with totals and checkout */}
            {cartLines.length > 0 && (
              <div className="cart-drawer-footer">
                {/* Totals Table */}
                <div className="cart-totals-table">
                  <div className="cart-total-line final" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <span>Total a Pagar:</span>
                    <strong style={{ color: '#f5a800', fontSize: '1.15rem' }}>{formatKwanzas(cartSubtotal)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-comprar"
                  onClick={() => handleStartOrder()}
                >
                  <MessageCircle size={16} />
                  <span>Fazer Pedido</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. PRODUCT DETAIL MODAL (QUICK VIEW)                                     */}
      {/* ========================================================================= */}
      {detailProduct && (
        <div className="modal-overlay" onClick={() => setDetailProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setDetailProduct(null)}
            >
              <X size={18} />
            </button>

            <div className="quick-view-grid">
              <div className="quick-view-img-box">
                <img
                  src={detailProduct.image}
                  alt={detailProduct.name}
                  className="quick-view-img"
                />
              </div>

              <div>
                <span className="boti-cat-badge">{detailProduct.category}</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: 6, lineHeight: 1.2 }}>
                  {detailProduct.name}
                </h3>

                <div style={{ margin: '14px 0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Preço Unitário:</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f5a800' }}>
                    {formatKwanzas(detailProduct.price)}
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                  {detailProduct.technicalSpecs || 'Equipamento hospitalar certificado com calibração técnica e garantia oficial em Luanda.'}
                </p>

                <ul className="quick-view-specs-list">
                  <li className="quick-view-spec-item">
                    <CheckCircle size={14} color="#10b981" />
                    <span>Conformidade com Normas Sanitárias CE e ISO 13485</span>
                  </li>
                  <li className="quick-view-spec-item">
                    <CheckCircle size={14} color="#10b981" />
                    <span>Disponível para entrega imediata em Luanda</span>
                  </li>
                  <li className="quick-view-spec-item">
                    <CheckCircle size={14} color="#10b981" />
                    <span>Faturação comercial com NIF incluída</span>
                  </li>
                </ul>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn-comprar"
                    style={{ flex: 1 }}
                    onClick={() => { addToCart(detailProduct); setDetailProduct(null); }}
                  >
                    <ShoppingBag size={16} />
                    <span>Adicionar à Sacola</span>
                  </button>
                  <a
                    href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=Olá!%20Gostaria%20de%20detalhes%20do%20equipamento:%20${encodeURIComponent(detailProduct.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-whatsapp-float"
                    style={{ position: 'static' }}
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. CHECKOUT PROFORMA MODAL (REGRAS DE NEGÓCIO ANGOLA)                    */}
      {/* ========================================================================= */}
      {checkoutModalOpen && (
        <div className="modal-overlay" onClick={() => setCheckoutModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setCheckoutModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto' }}>
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900 }}>Emissão de Factura Proforma</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Preencha os dados da sua instituição médica para formalização da encomenda.
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="form-field-group">
                <label className="form-field-label">Nome da Empresa / Clínica / Hospital *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clínica Girassol, Hospital Militar ou Particular"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-field-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field-group">
                  <label className="form-field-label">NIF da Empresa (Para Faturação AGT)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5400000000"
                    value={customerNif}
                    onChange={(e) => setCustomerNif(e.target.value)}
                    className="form-field-input"
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-field-label">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+244 9xx xxx xxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="form-field-input"
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">E-mail para Envio da Factura *</label>
                <input
                  type="email"
                  required
                  placeholder="compras@suaclinica.ao"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="form-field-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-field-group">
                  <label className="form-field-label">Província *</label>
                  <select
                    value={selectedProvinceId}
                    onChange={(e) => setSelectedProvinceId(e.target.value)}
                    className="form-field-select"
                  >
                    {ANGOLA_PROVINCES.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name} ({prov.estimatedDays})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-group">
                  <label className="form-field-label">Meio de Pagamento *</label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethodId)}
                    className="form-field-select"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Endereço Completo de Entrega *</label>
                <input
                  type="text"
                  required
                  placeholder="Bairro, Rua, Edifício / Pavilhão Clínico"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="form-field-input"
                />
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: isDarkMode ? '#0d1e38' : '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Total Proforma ({currentProvince.name}):</span>
                  <strong style={{ color: '#f5a800', fontSize: '1.1rem' }}>{formatKwanzas(cartTotal)}</strong>
                </div>
              </div>

              <button
                type="submit"
                className="btn-comprar"
                disabled={submittingOrder}
              >
                <CheckCircle size={16} />
                <span>{submittingOrder ? 'A processar no banco...' : 'Confirmar & Emitir Factura Proforma'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. CUSTOMER SUPPORT / CHAT ONLINE MODAL                                  */}
      {/* ========================================================================= */}
      {chatModalOpen && (
        <div className="modal-overlay" onClick={() => setChatModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 480, height: 560, display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Headphones size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Apoio Clínico Laurinita</h4>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>● Consultores Online</span>
                </div>
              </div>
              <button type="button" className="cart-close-btn" onClick={() => setChatModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: 16,
                    backgroundColor: item.sender === 'user' ? '#071326' : (isDarkMode ? '#0d1e38' : '#f1f5f9'),
                    color: item.sender === 'user' ? '#f5a800' : (isDarkMode ? '#ffffff' : '#1e293b'),
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}
                >
                  {item.text}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="Escreva a sua dúvida..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                className="form-field-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={sendChatMessage}
                style={{ padding: '0 16px', backgroundColor: '#f5a800', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={16} color="#071326" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. LOGIN MODAL                                                           */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setShowLoginModal(false)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 8, textAlign: 'center' }}>
              Entrar no Sistema
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginBottom: 20 }}>
              Acesso exclusivo para colaboradores e clientes da Laurinita Distribuidora Ltda.
            </p>

            <form onSubmit={handleLogin}>
              <div className="form-field-group">
                <label className="form-field-label">Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="form-field-input"
                />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Palavra-passe</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="form-field-input"
                />
              </div>
              <button type="submit" className="btn-comprar" style={{ width: '100%', marginTop: 12 }}>
                <Key size={15} />
                <span>Entrar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOVIMENTAÇÃO MANUAL DE ESTOQUE (ENTRADA / SAÍDA EM BANCO D1)        */}
      {/* ========================================================================= */}
      {stockModalProduct && (
        <div className="modal-overlay" onClick={() => setStockModalProduct(null)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setStockModalProduct(null)}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Ajuste de Estoque</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Persistência atômica no banco de dados SQLite / D1</p>
              </div>
            </div>

            <div style={{ backgroundColor: isDarkMode ? '#061124' : '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{stockModalProduct.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: 4, color: '#64748b' }}>
                <span>Categoria: {stockModalProduct.category}</span>
                <span>Saldo Atual: <strong style={{ color: '#059669' }}>{stockModalProduct.stock} un.</strong></span>
              </div>
            </div>

            <form onSubmit={submitManualMovement}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
                  Tipo de Movimentação:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStockMovementType('Entrada')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: stockMovementType === 'Entrada' ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: stockMovementType === 'Entrada' ? '#ecfdf5' : 'transparent',
                      color: stockMovementType === 'Entrada' ? '#059669' : '#64748b',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Entrada (Recebimento)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMovementType('Saída')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: stockMovementType === 'Saída' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: stockMovementType === 'Saída' ? '#fee2e2' : 'transparent',
                      color: stockMovementType === 'Saída' ? '#dc2626' : '#64748b',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    - Saída (Ajuste / Avaria)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                  Quantidade de Unidades:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockDelta}
                  onChange={(e) => setStockDelta(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800 }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                  Motivo da Movimentação:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Recebimento de Lote de Importação / Ajuste Físico"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  className="btn-comprar"
                  style={{ flex: 1 }}
                  disabled={isSubmittingAdmin}
                >
                  <Check size={16} />
                  <span>{isSubmittingAdmin ? 'A gravar no banco...' : 'Confirmar Ajuste'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #cbd5e1', background: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO DE NOVO EQUIPAMENTO MÉDICO (BANCO D1)                      */}
      {/* ========================================================================= */}
      {newProductModalOpen && (
        <div className="modal-overlay" onClick={() => setNewProductModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setNewProductModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Novo Equipamento Hospitalar</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Cadastrar produto diretamente no banco de dados</p>
              </div>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                  Nome do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eletrocardiógrafo 12 Canais Digital"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                    Categoria *
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  >
                    {adminCategories.filter((c) => c !== 'Todos').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                    Preço (AOA) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                    Estoque Inicial (un.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                    Estoque Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProdMin}
                    onChange={(e) => setNewProdMin(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: isDarkMode ? '#cbd5e1' : '#334155' }}>
                    Imagem do Equipamento
                  </label>
                  {/* Mode switch pills */}
                  <div style={{ display: 'inline-flex', padding: 2, borderRadius: 8, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: imageInputMode === 'upload' ? '#0f766e' : 'transparent',
                        color: imageInputMode === 'upload' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b'),
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Upload size={12} />
                      <span>Upload Local</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: imageInputMode === 'url' ? '#0f766e' : 'transparent',
                        color: imageInputMode === 'url' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b'),
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Link2 size={12} />
                      <span>Link / URL</span>
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileSelect(file);
                      }}
                    />

                    {!newProdImg ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleImageFileSelect(file);
                        }}
                        style={{
                          border: isDraggingFile ? '2px dashed #0f766e' : '2px dashed #cbd5e1',
                          backgroundColor: isDraggingFile ? 'rgba(15,118,110,0.06)' : (isDarkMode ? '#1e293b' : '#f8fafc'),
                          borderRadius: 12,
                          padding: '18px 14px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: isDarkMode ? '#0f172a' : '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload size={18} />
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                          Clique para carregar ou arraste do seu computador
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          PNG, JPG, WEBP (otimização e compressão automática)
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid #10b981',
                          backgroundColor: isDarkMode ? 'rgba(16,185,129,0.08)' : '#f0fdf4'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <img
                            src={newProdImg}
                            alt="Prévia"
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {localFileName || 'Imagem Local Carregada'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                              <CheckCircle2 size={12} />
                              <span>Pronta para o catálogo</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Trocar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewProdImg('');
                              setLocalFileName('');
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 8,
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                            title="Remover imagem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="/products/monitor-uti.png ou URL HTTPS"
                      value={newProdImg}
                      onChange={(e) => {
                        setNewProdImg(e.target.value);
                        setLocalFileName('');
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    {newProdImg && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img
                          src={newProdImg}
                          alt="Prévia URL"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'contain', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Prévia do link informado</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                  Descrição / Especificações Técnicas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes técnicos, certificações CE/ISO, voltagem, garantia..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  className="btn-comprar"
                  style={{ flex: 1 }}
                  disabled={isSubmittingAdmin}
                >
                  <Check size={16} />
                  <span>{isSubmittingAdmin ? 'A cadastrar...' : 'Salvar Equipamento'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewProductModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #cbd5e1', background: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 14. INSTITUTIONAL FOOTER (ESTILO RACHI.AO)                                */}
      {/* ========================================================================= */}
      <footer className="store-footer">
        <div className="footer-container">
          <div className="footer-col">
            <h4 className="footer-brand-title">Laurinita Distribuidora Ltda</h4>
            <p className="footer-brand-desc">
              Distribuição oficial de equipamentos médicos, hospitalares e laboratoriais em Angola.
            </p>
          </div>

          <div className="footer-col">
            <h4>Apoio ao Cliente</h4>
            <ul>
              <li><a href={`https://wa.me/${STORE_INFO.whatsappNumber}`} target="_blank" rel="noopener noreferrer">Suporte Técnico WhatsApp</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Sede & Contactos</h4>
            <ul>
              <li style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <MapPin size={16} color="#f5a800" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{STORE_INFO.address}, Luanda, Angola</span>
              </li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Phone size={14} color="#f5a800" style={{ flexShrink: 0 }} />
                <span>+244 923 333 804 / 912 000 000</span>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Formas de Pagamento</h4>
            <ul>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <CreditCard size={14} color="#f5a800" style={{ flexShrink: 0 }} />
                <span>Multicaixa Express / TPA</span>
              </li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Building2 size={14} color="#f5a800" style={{ flexShrink: 0 }} />
                <span>Transferência Bancária (IBAN)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-strip">
          <div>
            © 2026 Laurinita Distribuidora Ltda. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL: DADOS DE CONTATO & WHATSAPP (PRINT ADAPTADO AO DESIGN EXISTENTE)    */}
      {/* ========================================================================= */}
      {orderContactModalOpen && (
        <div className="modal-overlay" onClick={() => setOrderContactModalOpen(false)}>
          <div className="contact-order-modal-card" onClick={(e) => e.stopPropagation()}>
            {orderStep === 'contact' ? (
              /* ================== STEP 1: DADOS DE CONTATO ================== */
              <div>
                {/* Header with Back Arrow */}
                <div className="contact-modal-header">
                  <button
                    type="button"
                    className="contact-modal-back-btn"
                    onClick={() => setOrderContactModalOpen(false)}
                    title="Voltar"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="contact-modal-title">Dados de contato</h3>
                </div>

                <p className="contact-modal-subtitle">
                  Selecione como deseja receber seu pedido.
                </p>

                {/* Delivery Options */}
                <div className="delivery-options-grid">
                  <div
                    className={`delivery-option-card ${deliveryMethod === 'delivery' ? 'active' : ''}`}
                    onClick={() => setDeliveryMethod('delivery')}
                  >
                    <div className="delivery-option-left">
                      <Truck size={22} className="delivery-option-icon" />
                      <span className="delivery-option-label">Entrega em domicílio</span>
                    </div>
                    <div className="delivery-radio-indicator">
                      {deliveryMethod === 'delivery' && <span className="delivery-radio-dot" />}
                    </div>
                  </div>

                  <div
                    className={`delivery-option-card ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                    onClick={() => setDeliveryMethod('pickup')}
                  >
                    <div className="delivery-option-left">
                      <ShoppingBag size={22} className="delivery-option-icon" />
                      <span className="delivery-option-label">Para levantar/remover</span>
                    </div>
                    <div className="delivery-radio-indicator">
                      {deliveryMethod === 'pickup' && <span className="delivery-radio-dot" />}
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleProceedToWhatsApp} className="contact-order-form">
                  <div className="contact-field-group">
                    <label className="contact-field-label">
                      Nome <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Digite seu nome"
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      className="contact-field-input"
                    />
                  </div>

                  <div className="contact-field-group">
                    <label className="contact-field-label">
                      Celular <span className="req-star">*</span>
                    </label>
                    <div className="angola-phone-input-group">
                      <div className="angola-flag-box">
                        <span className="angola-flag-icon" role="img" aria-label="Angola">🇦🇴</span>
                        <ChevronDown size={14} color="#64748b" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Digite o seu telemóvel"
                        value={orderCustomerPhone}
                        onChange={(e) => setOrderCustomerPhone(e.target.value)}
                        className="angola-phone-input"
                      />
                    </div>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div className="contact-field-group">
                      <label className="contact-field-label">
                        Endereço <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Digite seu endereço"
                        value={orderDeliveryAddress}
                        onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                        className="contact-field-input"
                      />
                    </div>
                  )}

                  <div className="contact-field-group">
                    <label className="contact-field-label">
                      Observações da ordem
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Instruções de entrega, referências da clínica..."
                      value={orderRemarks}
                      onChange={(e) => setOrderRemarks(e.target.value)}
                      className="contact-field-textarea"
                    />
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="contact-order-bottom-bar">
                    <button type="submit" className="btn-order-action">
                      <div className="btn-order-action-left">
                        <span className="order-qty-badge">{activeOrderCount || 1}</span>
                        <span className="order-btn-text">Fazer pedido</span>
                      </div>
                      <div className="btn-order-action-right">
                        <span className="order-btn-total">{formatKwanzas(activeOrderTotal)}</span>
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================== STEP 2: PEDIDO WHATSAPP ================== */
              <div>
                {/* Header with Back Arrow */}
                <div className="contact-modal-header">
                  <button
                    type="button"
                    className="contact-modal-back-btn"
                    onClick={() => setOrderStep('contact')}
                    title="Voltar aos dados de contato"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="contact-modal-title">Faça seu pedido pelo WhatsApp</h3>
                </div>

                {/* Direct WhatsApp Web Action Card */}
                <a
                  href={whatsAppOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-web-action-card"
                >
                  <div className="whatsapp-action-left">
                    <div className="whatsapp-icon-circle">
                      <MessageCircle size={22} color="#25D366" fill="#25D366" />
                    </div>
                    <span className="whatsapp-action-title">Acesse o WhatsApp Web.</span>
                  </div>
                  <ChevronRight size={18} color="#64748b" />
                </a>

                {/* QR Code Section */}
                <div className="whatsapp-qr-container">
                  <p className="whatsapp-qr-instruction">
                    Escaneie o código com seu celular.
                  </p>

                  <div className="whatsapp-qr-box">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code WhatsApp"
                        className="whatsapp-qr-image"
                      />
                    ) : (
                      <div style={{ height: 250, width: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={24} className="spin" />
                      </div>
                    )}
                  </div>

                  <p className="whatsapp-qr-subtext">
                    Ao ler o código QR com a câmera do celular, o WhatsApp abrirá diretamente com todos os produtos do seu pedido prontos para envio.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
