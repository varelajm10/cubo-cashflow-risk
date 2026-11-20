import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CUBO CashFlow Risk | Simulación Estocástica de Flujo de Fondos y AR Aging",
  description:
    "Plataforma SaaS B2B de ingeniería cuantitativa y simulación Monte Carlo para proyección de flujo de fondos y riesgo de incobrabilidad de cuentas por cobrar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#030712] text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
