import type { Metadata } from 'next';
import Shop from '../shop';

export const metadata: Metadata = {
  title: 'Painel de Gestão — Laurinita Distribuidora Ltda',
  description: 'Painel administrativo para gestão de equipamentos, estoque em banco e pedidos da Laurinita Distribuidora Ltda.',
};

export default function DashboardPage() {
  return <Shop initialView="admin" />;
}
