import React from 'react';

function ReceiptModal({ isOpen, onClose, receiptData }) {
  if (!isOpen || !receiptData) return null;

  const isDigital = receiptData.method !== 'cash';

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex justify-center items-center p-4 backdrop-blur-md" onClick={onClose}>
      
      {/* TICKET CONTAINER */}
      <div 
        className="relative bg-white w-full max-w-sm shadow-2xl animate-fade-in-up transform transition-all" 
        onClick={e => e.stopPropagation()}
        style={{ filter: "drop-shadow(0 20px 13px rgb(0 0 0 / 0.3))" }}
      >
        {/* EFECTO DE PAPEL RASGADO (CSS TRICK) */}
        <div className="absolute -top-2 left-0 right-0 h-4 bg-white" style={{ clipPath: "polygon(0% 100%, 5%  0%, 10% 100%, 15%  0%, 20% 100%, 25%  0%, 30% 100%, 35%  0%, 40% 100%, 45%  0%, 50% 100%, 55%  0%, 60% 100%, 65%  0%, 70% 100%, 75%  0%, 80% 100%, 85%  0%, 90% 100%, 95%  0%, 100% 100%)" }}></div>
        
        {/* CUERPO DEL TICKET */}
        <div className="p-8 pb-10">
            
            {/* LOGO */}
            <div className="flex justify-center mb-6 opacity-80">
                <div className="border-2 border-black p-2 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>

            <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
                <h2 className="text-2xl font-bold font-mono text-gray-900 tracking-wider">COMPROBANTE</h2>
                <p className="text-xs text-gray-500 font-mono mt-1 uppercase">ID: {receiptData.id.split('-')[0]}</p>
                <p className="text-xs text-gray-500 font-mono">{new Date(receiptData.date).toLocaleString()}</p>
            </div>

            {/* CONTENIDO */}
            <div className="space-y-4 font-mono text-sm text-gray-600">
                {!isDigital && receiptData.receiptUrl ? (
                    <div className="border-2 border-dashed border-gray-300 p-2 rounded bg-gray-50">
                        <img src={receiptData.receiptUrl} alt="Voucher" className="w-full h-auto grayscale contrast-125" />
                        <p className="text-center text-xs mt-2 italic">Foto del voucher original</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between">
                            <span>ENTIDAD:</span>
                            <span className="font-bold text-gray-800">{receiptData.lender}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>MÉTODO:</span>
                            <span className="uppercase">{receiptData.method === 'card' ? 'Visa *4242' : 'Yape / Plin'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>ESTADO:</span>
                            <span className="font-bold text-gray-800">APROBADO</span>
                        </div>
                    </>
                )}
            </div>

            {/* TOTAL */}
            <div className="mt-8 border-t-2 border-dashed border-gray-300 pt-6">
                <div className="flex justify-between items-end">
                    <span className="font-mono text-lg font-bold text-gray-600">TOTAL</span>
                    <span className="font-mono text-3xl font-extrabold text-black">S/ {receiptData.amount.toFixed(2)}</span>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center">
                <div className="bg-black text-white text-xs font-mono py-2 rounded mb-4">
                    COPIA CLIENTE
                </div>
                <img 
                    src="https://bwipjs-api.metafloor.com/?bcid=code128&text=1234567890&scale=2&height=5&includetext" 
                    alt="Barcode" 
                    className="h-12 w-full opacity-60 mix-blend-multiply"
                />
            </div>
        </div>

        {/* BOTÓN CERRAR FLOTANTE */}
        <button 
            onClick={onClose} 
            className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* EFECTO RASGADO ABAJO */}
        <div className="absolute -bottom-2 left-0 right-0 h-4 bg-white" style={{ clipPath: "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)" }}></div>
      </div>
    </div>
  );
}

export default ReceiptModal;