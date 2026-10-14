import type { Metadata } from "next";
import "./laurinita.css";

export const metadata: Metadata = {
  title: "Laurinita | Cuidar começa aqui",
  description: "Equipamentos hospitalares, mobilidade e cuidados. Loja Laurinita.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
