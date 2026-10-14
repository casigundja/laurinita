import type { Metadata } from "next";
import "./laurinita.css";

export const metadata: Metadata = {
  title: "Laurinita Distribuidora Ltda — Equipamentos Médicos & Hospitalares em Angola",
  description: "A sua distribuidora online de equipamentos hospitalares, laboratoriais e consumíveis clínicos em Angola. Entrega rápida em Luanda e províncias com faturação oficial.",
  icons: {
    icon: "https://us-east-1-prod-treinta-assets-bucket.s3.amazonaws.com/a40e661f-40a4-595b-bea0-53e799f6561f.jpeg",
    shortcut: "https://us-east-1-prod-treinta-assets-bucket.s3.amazonaws.com/a40e661f-40a4-595b-bea0-53e799f6561f.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col justify-between">{children}</body>
    </html>
  );
}
