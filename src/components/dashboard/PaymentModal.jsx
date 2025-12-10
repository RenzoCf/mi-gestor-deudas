import React, { useState, useEffect } from 'react';

// Sub-componente: Tarjeta Visual (Versión Compacta)
const CreditCardVisual = ({ number, name, expiry, cvv }) => (
  <div className="w-full h-40 bg-gradient-to-br from-slate-800 to-black rounded-xl shadow-lg p-5 text-white relative overflow-hidden transition-transform transform hover:scale-105 duration-500 border border-slate-600">
    {/* Efecto de brillo de fondo */}
    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-white opacity-5 blur-3xl"></div>
    <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 rounded-full bg-indigo-500 opacity-10 blur-3xl"></div>

    <div className="flex justify-between items-start z-10 relative">
      <div className="w-10 h-7 bg-yellow-600 rounded opacity-80 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full border border-yellow-400 opacity-50 rounded" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, #000 2px, #000 3px)" }}></div>
      </div>
      <span className="font-bold italic text-base tracking-widest opacity-80">VISA</span>
    </div>

    <div className="mt-6 z-10 relative">
      <p className="font-mono text-xl tracking-widest drop-shadow-md">
        {number || '#### #### #### ####'}
      </p>
    </div>

    <div className="flex justify-between items-end mt-4 z-10 relative">
      <div>
        <p className="text-[9px] uppercase text-gray-300 tracking-wider">Titular</p>
        <p className="font-medium text-sm tracking-wide uppercase truncate w-32">
          {name || 'NOMBRE APELLIDO'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[9px] uppercase text-gray-300 tracking-wider">Expira</p>
        <p className="font-mono text-sm font-medium">{expiry || 'MM/AA'}</p>
      </div>
    </div>
  </div>
);

function PaymentModal({ isOpen, onClose, onConfirmPayment, paymentData }) {
  const [method, setMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');

  // Datos del formulario
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(''); // Estado para PayPal
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setLoading(false);
      setMethod('card');
      setCardNumber(''); setExpiry(''); setCvv(''); setName(''); setPhone(''); setPaypalEmail('');
      setReceiptFile(null);
    }
  }, [isOpen]);

  // Formato automático de tarjeta (espacios cada 4)
  const handleCardNumberChange = (e) => {
    const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length; i += 4) parts.push(v.substr(i, 4));
    setCardNumber(parts.length > 1 ? parts.join(' ') : v);
  };

  // Formato fecha MM/AA
  const handleExpiryChange = (e) => {
    let v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
    setExpiry(v);
  };
  
  // MANEJADOR DE NOMBRE (SOLO LETRAS Y ESPACIOS)
  const handleNameChange = (e) => {
    // Permite letras (A-Z), espacios y caracteres acentuados comunes en nombres (ÑÁÉÍÓÚÜ)
    const filteredValue = e.target.value.toUpperCase().replace(/[^A-Z\sÑÁÉÍÓÚÜ]/g, ''); 
    setName(filteredValue);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    
    // VALIDACIÓN MÁS REALISTA: 
    if (method === 'card' && (
      cardNumber.length < 19 || expiry.length !== 5 || cvv.length !== 3 || !name || name.trim().length < 3
    )) {
      return alert("Datos de tarjeta incompletos o inválidos. Verifica que el CVV tenga 3 dígitos y el Nombre solo contenga letras.");
    }
    if (method === 'yape' && phone.length < 9) return alert("Celular inválido. Debe tener 9 dígitos.");
    if (method === 'paypal' && !paypalEmail.includes('@')) return alert("Email de PayPal inválido");
    if (method === 'cash' && !receiptFile) return alert("Falta el comprobante");

    setStep('processing');
    setLoading(true);

    // Si es PayPal o Tarjeta, simulamos llamada a API
    if (method === 'paypal' || method === 'card') {
      try {
        // Simulando llamada a API de pago
        await fetch('/api/fake-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: paymentData.amount,
            email: method === 'paypal' ? paypalEmail : 'card_user@example.com'
          })
        });
      } catch (e) { console.error("Simulated API error", e); }
    }

    setTimeout(() => {
      setStep('success');
      setLoading(false);
      setTimeout(() => {
        onConfirmPayment(paymentData.debtId, paymentData.paymentId, method, receiptFile);
        onClose();
      }, 2000);
    }, 2500);
  };

  if (!isOpen || !paymentData) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100">

        {/* HEADER COMPACTO */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pagando a {paymentData.lender}</p>
              <h3 className="text-3xl font-extrabold tracking-tight">S/ {paymentData.amount?.toFixed(2)}</h3>
            </div>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
              <span className="text-xl">🔒</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <>
              {/* TABS DE NAVEGACIÓN COMPACTOS */}
              <div className="flex p-1 bg-gray-100 rounded-lg mb-5">
                {['card', 'yape', 'paypal', 'cash'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all duration-200 ${method === m
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {m === 'card' && '💳 Tarjeta'}
                    {m === 'yape' && '📱 Yape'}
                    {m === 'paypal' && '🅿️ PayPal'}
                    {m === 'cash' && '💵 Efectivo'}
                  </button>
                ))}
              </div>

              <form onSubmit={handlePay} className="space-y-4 animate-fade-in-up">

                {/* --- OPCIÓN TARJETA --- */}
                {method === 'card' && (
                  <>
                    <div className="mb-4 flex justify-center">
                      <CreditCardVisual number={cardNumber} name={name} expiry={expiry} cvv={cvv} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Número de Tarjeta</label>
                        <div className="relative">
                          <input
                            type="text" placeholder="0000 0000 0000 0000" maxLength="19"
                            value={cardNumber} onChange={handleCardNumberChange}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono text-sm text-gray-700"
                          />
                          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">💳</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Expira</label>
                          <input
                            type="text" placeholder="MM/AA" maxLength="5"
                            value={expiry} onChange={handleExpiryChange}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-center text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">CVV</label>
                          <input
                            type="password" placeholder="•••" 
                            maxLength="3"
                            value={cvv} 
                            onChange={e => setCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-center tracking-widest text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Nombre en Tarjeta</label>
                        <input
                          type="text" placeholder="COMO APARECE EN EL PLÁSTICO"
                          value={name} 
                          onChange={handleNameChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all uppercase text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* --- OPCIÓN YAPE --- */}
                {method === 'yape' && (
                  <div className="text-center py-4">
                    <div className="bg-purple-50 border-2 border-dashed border-purple-200 rounded-xl p-4 mb-4">
                      <div className="w-24 h-24 bg-white mx-auto rounded-lg shadow-sm flex items-center justify-center p-1.5 mb-2">
                        {/* Simulación de QR */}
                        <div className="w-full h-full border-4 border-black border-t-purple-600 border-r-pink-500 border-b-purple-600 border-l-pink-500 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YapePagar')] bg-cover opacity-80"></div>
                      </div>
                      <p className="text-purple-800 font-bold text-xs">Escanea este QR</p>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 text-left ml-1">O ingresa tu celular</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-purple-600 font-bold text-sm">+51</span>
                        <input
                          type="tel" placeholder="999 999 999" maxLength="9"
                          value={phone} 
                          // FILTRO DE SOLO NUMEROS APLICADO AQUÍ
                          onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full pl-12 pr-3 py-2 bg-purple-50 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-bold text-gray-700 text-base tracking-wider"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- OPCIÓN PAYPAL --- */}
                {method === 'paypal' && (
                  <div className="text-center py-4 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                      <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-2xl">
                        🅿️
                      </div>
                      <p className="text-blue-800 font-bold text-sm">Conectar con PayPal</p>
                      <p className="text-blue-600 text-xs">Serás redirigido de forma segura</p>
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Email de PayPal</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">📧</span>
                        <input
                          type="email" placeholder="usuario@paypal.com"
                          value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- OPCIÓN EFECTIVO --- */}
                {method === 'cash' && (
                  <div className="text-center py-4">
                    <label
                      htmlFor="file-upload"
                      className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${receiptFile
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                        }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-3 pb-4">
                        {receiptFile ? (
                          <>
                            <div className="text-3xl mb-1">📄</div>
                            <p className="text-xs text-green-700 font-semibold truncate w-40">{receiptFile.name}</p>
                            <p className="text-[10px] text-green-500 mt-0.5">Clic para cambiar</p>
                          </>
                        ) : (
                          <>
                            <svg className="w-8 h-8 mb-2 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p className="mb-1 text-xs text-gray-500"><span className="font-semibold">Subir voucher</span></p>
                            <p className="text-[10px] text-gray-400">JPG, PNG, PDF</p>
                          </>
                        )}
                      </div>
                      <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} />
                    </label>
                  </div>
                )}

                {/* BOTONES ACCIÓN COMPACTOS */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`flex-[2] py-2.5 text-white font-bold rounded-lg shadow-md transform active:scale-95 transition-all flex justify-center items-center gap-2 text-sm ${method === 'yape' ? 'bg-purple-600 hover:bg-purple-700' :
                        method === 'cash' ? 'bg-green-600 hover:bg-green-700' :
                          method === 'paypal' ? 'bg-[#0070BA] hover:bg-[#003087]' :
                            'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/30'
                      }`}
                  >
                    <span>Pagar</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ESTADO PROCESANDO */}
          {step === 'processing' && (
            <div className="py-10 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xl animate-pulse">🔒</div>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">Procesando...</h4>
              <p className="text-sm text-gray-500">Contactando con el banco</p>
            </div>
          )}

          {/* ESTADO ÉXITO */}
          {step === 'success' && (
            <div className="py-8 text-center animate-bounce-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h4 className="text-2xl font-extrabold text-gray-800 mb-1">¡Aprobado!</h4>
              <p className="text-sm text-gray-500 font-medium">Pago registrado correctamente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;