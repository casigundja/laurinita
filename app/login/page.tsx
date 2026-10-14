import type { Metadata } from 'next';
import Shop from '../shop';

export const metadata: Metadata = {
  title: 'Entrar no Sistema — Laurinita Distribuidora Ltda',
  description: 'Acesso seguro ao Painel de Gestão da Laurinita Distribuidora Ltda.',
};

export default function LoginPage() {
  return <Shop initialView="login" />;
}
