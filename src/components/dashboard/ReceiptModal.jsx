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

                    {/* HEADER SUNAT STYLE */}
                    <div className="text-center border-b border-gray-300 pb-4 mb-4">
                        <h2 className="text-lg font-bold text-gray-900">FINANZAS EDU S.A.C.</h2>
                        <p className="text-[10px] text-gray-500">AV. JAVIER PRADO ESTE 1234 - LIMA</p>
                        <p className="text-[10px] text-gray-500">RUC: 20123456789</p>

                        <div className="border border-gray-800 p-2 mt-3 inline-block w-48">
                            <h3 className="text-sm font-bold">BOLETA DE VENTA</h3>
                            <h3 className="text-sm font-bold">ELECTRÓNICA</h3>
                            <p className="text-xs mt-1">B001-{receiptData.id.split('-')[0].toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex justify-between text-xs mb-4 font-mono">
                        <div>
                            <p>FECHA: {new Date(receiptData.date).toLocaleDateString()}</p>
                            <p>HORA: {new Date(receiptData.date).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                            <p>MONEDA: PEN</p>
                            <p>IGV: 18.00%</p>
                        </div>
                    </div>

                    {/* CONTENIDO TABLA */}
                    <div className="border-t border-b border-gray-300 py-2 mb-4">
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="text-left">
                                    <th className="pb-1">CANT</th>
                                    <th className="pb-1">DESCRIPCIÓN</th>
                                    <th className="pb-1 text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1.00</td>
                                    <td>PAGO CUOTA - {receiptData.lender.toUpperCase()}</td>
                                    <td className="text-right">{receiptData.amount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-1 font-mono text-xs text-right mb-4">
                        <div className="flex justify-between">
                            <span>OP. GRAVADA:</span>
                            <span>S/ {(receiptData.amount / 1.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>IGV (18%):</span>
                            <span>S/ {(receiptData.amount - (receiptData.amount / 1.18)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm mt-2 border-t border-gray-300 pt-2">
                            <span>IMPORTE TOTAL:</span>
                            <span>S/ {receiptData.amount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="text-xs text-center border-t border-gray-300 pt-3 mb-2">
                        <p className="font-bold mb-1">FORMA DE PAGO</p>
                        <p className="uppercase">
                            {receiptData.method === 'card' ? 'TARJETA CRÉDITO VISA' :
                                receiptData.method === 'paypal' ? 'PAYPAL (SALDO/TARJETA)' :
                                    receiptData.method === 'yape' ? 'YAPE / PLIN' :
                                        'EFECTIVO / TRANSFERENCIA'}
                        </p>
                    </div>

                    {!isDigital && receiptData.receiptUrl && (
                        <div className="mt-4 border-2 border-dashed border-gray-300 p-2 rounded bg-gray-50 text-center">
                            <p className="text-[10px] mb-1">VOUCHER ADJUNTO:</p>
                            <img src={receiptData.receiptUrl} alt="Voucher" className="max-h-32 mx-auto grayscale contrast-125" />
                        </div>
                    )}

                    {/* QR SIMULADO SUNAT */}
                    <div className="mt-6 flex justify-center">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=20123456789|03|B001|${receiptData.id}|${receiptData.amount}|${new Date().toLocaleDateString()}|`}
                            alt="QR SUNAT"
                            className="w-20 h-20 opacity-90"
                        />
                    </div>
                    <p className="text-[9px] text-center mt-2 text-gray-500">Representación Impresa de la Boleta de Venta Electrónica</p>
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