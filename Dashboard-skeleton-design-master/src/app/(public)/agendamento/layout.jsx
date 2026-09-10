export default function AgendamentoLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <main className="w-full max-w-4xl bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-800">
        {children}
      </main>
    </div>
  );
}