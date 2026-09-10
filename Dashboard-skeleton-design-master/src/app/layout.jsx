import './globals.css'; // Ajuste o caminho se o seu CSS global tiver outro nome

export const metadata = {
  title: 'Grasel Cerealista',
  description: 'Sistema de Controle de Pátio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* NADA de menus aqui, apenas repassa o conteúdo */}
        {children}
      </body>
    </html>
  );
}