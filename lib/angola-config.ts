// Configurações e regras de negócio para o mercado angolano

export interface ProvinceDelivery {
  id: string;
  name: string;
  fee: number; // in Kwanzas (Kz)
  estimatedDays: string;
  payOnDeliveryAllowed: boolean;
}

export const ANGOLA_PROVINCES: ProvinceDelivery[] = [
  { id: 'luanda', name: 'Luanda', fee: 3500, estimatedDays: '24 a 48 horas', payOnDeliveryAllowed: true },
  { id: 'bengo', name: 'Bengo / Icolo e Bengo', fee: 2500, estimatedDays: '24 horas (Área da Sede)', payOnDeliveryAllowed: true },
  { id: 'benguela', name: 'Benguela', fee: 18000, estimatedDays: '3 a 5 dias úteis', payOnDeliveryAllowed: false },
  { id: 'huambo', name: 'Huambo', fee: 20000, estimatedDays: '3 a 5 dias úteis', payOnDeliveryAllowed: false },
  { id: 'huila', name: 'Huíla (Lubango)', fee: 22000, estimatedDays: '4 a 6 dias úteis', payOnDeliveryAllowed: false },
  { id: 'cabinda', name: 'Cabinda', fee: 25000, estimatedDays: '3 a 5 dias úteis (Carga Aérea)', payOnDeliveryAllowed: false },
  { id: 'cuanza-sul', name: 'Cuanza Sul (Sumbe)', fee: 15000, estimatedDays: '2 a 4 dias úteis', payOnDeliveryAllowed: false },
  { id: 'cuanza-norte', name: 'Cuanza Norte (Ndalatando)', fee: 14000, estimatedDays: '2 a 4 dias úteis', payOnDeliveryAllowed: false },
  { id: 'malanje', name: 'Malanje', fee: 18000, estimatedDays: '3 a 5 dias úteis', payOnDeliveryAllowed: false },
  { id: 'uige', name: 'Uíge', fee: 18000, estimatedDays: '3 a 5 dias úteis', payOnDeliveryAllowed: false },
  { id: 'zaire', name: 'Zaire (Mbanza Kongo)', fee: 20000, estimatedDays: '3 a 5 dias úteis', payOnDeliveryAllowed: false },
  { id: 'namibe', name: 'Namibe', fee: 22000, estimatedDays: '4 a 6 dias úteis', payOnDeliveryAllowed: false },
  { id: 'cunene', name: 'Cunene', fee: 24000, estimatedDays: '5 a 7 dias úteis', payOnDeliveryAllowed: false },
  { id: 'bie', name: 'Bié (Cuito)', fee: 22000, estimatedDays: '4 a 6 dias úteis', payOnDeliveryAllowed: false },
  { id: 'moxico', name: 'Moxico (Luena)', fee: 25000, estimatedDays: '5 a 7 dias úteis', payOnDeliveryAllowed: false },
  { id: 'lunda-norte', name: 'Lunda Norte', fee: 25000, estimatedDays: '5 a 7 dias úteis', payOnDeliveryAllowed: false },
  { id: 'lunda-sul', name: 'Lunda Sul (Saurimo)', fee: 25000, estimatedDays: '5 a 7 dias úteis', payOnDeliveryAllowed: false },
  { id: 'cuando-cubango', name: 'Cuando Cubango', fee: 28000, estimatedDays: '5 a 8 dias úteis', payOnDeliveryAllowed: false },
];

export type PaymentMethodId = 'multicaixa_express' | 'bank_transfer' | 'cash_on_delivery';

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  name: string;
  badge: string;
  description: string;
  instructions: string;
  iconName: string;
  requiresPhone: boolean;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'multicaixa_express',
    name: 'MULTICAIXA Express',
    badge: 'Mais Rápido',
    description: 'Confirmação direta no telemóvel pelo aplicativo MULTICAIXA Express.',
    instructions: 'Insira o seu número de telemóvel associado ao MULTICAIXA Express. Você receberá uma notificação para autorizar o pagamento com o seu PIN.',
    iconName: 'Smartphone',
    requiresPhone: true,
  },
  {
    id: 'bank_transfer',
    name: 'Transferência Bancária / Depósito',
    badge: 'Contas Empresariais',
    description: 'Transfira diretamente para as contas da Laurinita Distribuidora Ltda.',
    instructions: 'Após finalizar, envie o comprovativo para o WhatsApp oficial com o número da sua encomenda.',
    iconName: 'Building2',
    requiresPhone: false,
  },
  {
    id: 'cash_on_delivery',
    name: 'Pagamento na Entrega (TPA ou Numerário)',
    badge: 'Disponível em Luanda e Bengo',
    description: 'Pague ao estafeta no momento em que receber a encomenda (Cartão via TPA ou Dinheiro).',
    instructions: 'Válido para encomendas na Província de Luanda e Icolo e Bengo. Tenha consigo o valor ou cartão Multicaixa.',
    iconName: 'Truck',
    requiresPhone: false,
  },
];

export const BANK_ACCOUNTS = [
  {
    bank: 'Banco Angolano de Investimentos (BAI)',
    iban: 'AO06 0040 0000 1234 5678 1012 3',
    accountNumber: '12345678101',
    holder: 'Laurinita Distribuidora Ltda',
  },
  {
    bank: 'Banco de Fomento Angola (BFA)',
    iban: 'AO06 0006 0000 8765 4321 2012 4',
    accountNumber: '87654321201',
    holder: 'Laurinita Distribuidora Ltda',
  },
];

export type OrderStatus =
  | 'Pendente'
  | 'Aguardando Pagamento'
  | 'Pago e Confirmado'
  | 'Em Preparação'
  | 'Enviado'
  | 'Entregue'
  | 'Cancelado'
  | 'Devolvido';

export const ORDER_STATUSES: { status: OrderStatus; label: string; color: string }[] = [
  { status: 'Pendente', label: 'Pendente', color: '#64748b' },
  { status: 'Aguardando Pagamento', label: 'Aguardando Pagamento', color: '#f59e0b' },
  { status: 'Pago e Confirmado', label: 'Pago e Confirmado', color: '#10b981' },
  { status: 'Em Preparação', label: 'Em Preparação', color: '#3b82f6' },
  { status: 'Enviado', label: 'Enviado / A Caminho', color: '#8b5cf6' },
  { status: 'Entregue', label: 'Entregue com Sucesso', color: '#059669' },
  { status: 'Cancelado', label: 'Cancelado', color: '#ef4444' },
  { status: 'Devolvido', label: 'Devolvido', color: '#991b1b' },
];

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'Entrada' | 'Saída' | 'Perda/Avaria' | 'Ajuste' | 'Devolução';
  quantity: number;
  reason: string;
  actor: string;
  date: string;
}
