'use client';

import React from 'react';

export default function QrCodePortariaPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
        <h1 className="text-xl font-bold text-sky-400 mb-2">CHECK-IN PORTARIA GRASEL</h1>
        <p className="text-xs text-gray-400 mb-6">
          Escaneie o QR Code abaixo para confirmar sua chegada no pátio
        </p>

        <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-inner">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://dashboard-grasel.vercel.app/checkin"
            alt="QR Code Check-in Portaria"
            className="w-64 h-64 mx-auto"
          />
        </div>

        <p className="text-sm font-semibold text-emerald-400 mb-6">
          Aponte a câmera do seu celular
        </p>

        <button
          onClick={() => window.print()}
          className="w-full bg-sky-500 hover:bg-sky-400 text-gray-950 font-bold py-2.5 rounded-lg transition-colors print:hidden"
        >
          Imprimir Placa / QR Code
        </button>
      </div>
    </div>
  );
}