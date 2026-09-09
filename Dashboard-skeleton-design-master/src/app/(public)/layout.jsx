export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Container simples centralizado sem headers, menus ou sidebars */}
      <main className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
}