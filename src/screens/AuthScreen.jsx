import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          setError('Completa todos los campos');
          setLoading(false);
          return;
        }
        const result = await login(formData.email, formData.password);
        if (!result.success) setError(result.error?.message || 'Credenciales inválidas');
      } else {
        if (!formData.email || !formData.password || !formData.name) {
          setError('Completa todos los campos');
          setLoading(false);
          return;
        }
        const result = await register(formData.email, formData.password, formData.name);
        if (result.success) {
          if (result.needsConfirmation) {
            setSuccessMessage('✅ Revisa tu email para confirmar.');
            setFormData({ email: '', password: '', name: '' });
          }
        } else {
          setError(result.error?.message || 'Error al registrar');
        }
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  return (
    // CONTENEDOR PRINCIPAL: Altura fija de pantalla, sin scroll (overflow-hidden)
    <div className="h-screen w-full bg-slate-900 relative flex items-center justify-center overflow-hidden">
      
      {/* FONDO ANIMADO (Decoración) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[120px] opacity-30"></div>
      </div>

      {/* TARJETA CENTRAL (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 mx-4 animate-fade-in-up">
        
        {/* LOGO Y TÍTULO */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl shadow-lg mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Finanzas Edu</h1>
          <p className="text-slate-300 text-sm mt-1">Tu control financiero inteligente</p>
        </div>

        {/* MENSAJES DE ERROR/EXITO */}
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs text-center font-medium">{error}</div>}
        {successMessage && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-xs text-center font-medium">{successMessage}</div>}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NOMBRE (Solo registro) */}
          {!isLogin && (
            <div className="relative">
                <input
                  type="text" name="name" placeholder="Nombre completo"
                  value={formData.name} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 text-sm outline-none transition-all"
                />
                <span className="absolute left-3 top-3.5 text-slate-400">👤</span>
            </div>
          )}

          <div className="relative">
            <input
              type="email" name="email" placeholder="Correo electrónico"
              value={formData.email} onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 text-sm outline-none transition-all"
            />
            <span className="absolute left-3 top-3.5 text-slate-400">✉️</span>
          </div>

          <div className="relative">
            <input
              type="password" name="password" placeholder="Contraseña"
              value={formData.password} onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 text-sm outline-none transition-all"
            />
            <span className="absolute left-3 top-3.5 text-slate-400">🔒</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'Ingresar' : 'Registrarse')}
          </button>
        </form>

        {/* FOOTER / SWITCH */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-xs">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors underline decoration-dotted"
            >
              {isLogin ? "Crea una aquí" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>

      {/* COPYRIGHT DISCRETO */}
      <div className="absolute bottom-4 text-center w-full z-10">
        <p className="text-slate-500 text-[10px] font-medium tracking-wider opacity-60">© 2025 FINANZAS EDU</p>
      </div>
    </div>
  );
}

export default AuthScreen;