export type UserRole = 'admin' | 'manager' | 'operator' | 'customer';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  token?: string;
}

export interface RolePermissions {
  canViewOverview: boolean;
  canManageProducts: boolean;
  canCreateProduct: boolean;
  canDeleteProduct: boolean;
  canManageStock: boolean;
  canApplyStockMovement: boolean;
  canViewOrders: boolean;
  canUpdateOrderStatus: boolean;
  canViewCustomers: boolean;
  canViewFinancialReports: boolean;
  canManageUsers: boolean;
  badgeLabel: string;
  color: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewOverview: true,
    canManageProducts: true,
    canCreateProduct: true,
    canDeleteProduct: true,
    canManageStock: true,
    canApplyStockMovement: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canViewCustomers: true,
    canViewFinancialReports: true,
    canManageUsers: true,
    badgeLabel: '',
    color: '#0f766e',
  },
  manager: {
    canViewOverview: true,
    canManageProducts: true,
    canCreateProduct: true,
    canDeleteProduct: false,
    canManageStock: true,
    canApplyStockMovement: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canViewCustomers: true,
    canViewFinancialReports: true,
    canManageUsers: false,
    badgeLabel: 'Gerente de Estoque & Vendas',
    color: '#1d4ed8',
  },
  operator: {
    canViewOverview: false,
    canManageProducts: false,
    canCreateProduct: false,
    canDeleteProduct: false,
    canManageStock: false,
    canApplyStockMovement: false,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canViewCustomers: true,
    canViewFinancialReports: false,
    canManageUsers: false,
    badgeLabel: 'Operador / Atendente',
    color: '#d97706',
  },
  customer: {
    canViewOverview: false,
    canManageProducts: false,
    canCreateProduct: false,
    canDeleteProduct: false,
    canManageStock: false,
    canApplyStockMovement: false,
    canViewOrders: false,
    canUpdateOrderStatus: false,
    canViewCustomers: false,
    canViewFinancialReports: false,
    canManageUsers: false,
    badgeLabel: 'Cliente',
    color: '#64748b',
  },
};

export interface DefaultAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  description: string;
}

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  {
    name: 'Dra. Laurinda Gundja',
    email: 'admin@laurinita.ao',
    password: 'Admin@2026!',
    role: 'admin',
    description: 'Acesso total irrestrito (produtos, estoque, relatórios e usuários)',
  },
  {
    name: 'Carlos Alberto',
    email: 'gerente@laurinita.ao',
    password: 'Gerente@2026!',
    role: 'manager',
    description: 'Gestão de estoque, produtos, auditoria e encomendas',
  },
  {
    name: 'Ana Paula',
    email: 'operador@laurinita.ao',
    password: 'Operador@2026!',
    role: 'operator',
    description: 'Atendimento de balcão e despacho de encomendas',
  },
];

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return Boolean(ROLE_PERMISSIONS[role]?.[permission]);
}
