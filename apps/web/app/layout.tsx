import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copilote immobilier — Prix au m² (Incrément 0)",
  description:
    "Chaîne DVF → carte : prix au m² par commune, sourcé et daté. Aide à la décision immobilière.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
