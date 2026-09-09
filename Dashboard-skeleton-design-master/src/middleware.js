import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Libera a rota de check-in para acesso público sem redirecionar para login
  if (pathname.startsWith('/checkin')) {
    return NextResponse.next();
  }

  // 2. Permite o fluxo normal para as demais páginas do sistema
  return NextResponse.next();
}

export const config = {
  // Executa o middleware em todas as rotas do app, exceto arquivos estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};