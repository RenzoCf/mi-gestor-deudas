import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Perfil() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Datos del perfil
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState(""); // Solo guardamos el teléfono

  // 1. Cargar datos al entrar
  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select(`username, website, full_name, phone`)
        .eq('id', user.id)
        .single();

      if (!ignore && data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setWebsite(data.website || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    }
    getProfile();
    return () => { ignore = true; };
  }, [user]);

  // 2. Guardar datos
  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const updates = {
      id: user.id,
      username,
      full_name: fullName,
      website,
      phone, // Guardamos el número en la base de datos
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      alert(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setUpdating(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  const getInitials = () => {
    if (fullName) return fullName.substring(0, 2).toUpperCase();
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="h-full w-full bg-slate-100 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 z-0">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-full">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full">
                <div className="w-28 h-28 rounded-full border-4 border-indigo-500 shadow-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold mb-5 mx-auto">
                    {getInitials()}
                </div>
                
                <h2 className="text-xl font-bold mb-1 truncate px-2">{fullName || "Usuario"}</h2>
                <p className="text-indigo-300 text-xs mb-6 font-mono">{user.email}</p>
                
                {/* ESTADO DE NOTIFICACIONES */}
                <div className="mb-8">
                    {phone ? (
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                            <p className="text-xs text-green-300 font-bold mb-1">📱 SMS Activos</p>
                            <p className="text-[10px] text-slate-300">Alertas al {phone}</p>
                        </div>
                    ) : (
                        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-xs text-yellow-300 font-bold mb-1">Sin Celular</p>
                            <p className="text-[10px] text-slate-300">Agrega tu número para recibir alertas.</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-sm font-bold transition-all border border-red-600/20 flex items-center justify-center gap-2 group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Cerrar Sesión
                </button>
            </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="md:w-2/3 p-8 md:p-12 bg-white flex flex-col justify-center overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
                <p className="text-slate-500 text-sm">Mantén tus datos de contacto actualizados</p>
            </div>

            <form onSubmit={updateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cuenta</label>
                        <input disabled value={user.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Tu nombre" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="@usuario" />
                    </div>

                    {/* CAMPO DE CELULAR PARA TWILIO */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">Celular para Alertas (SMS)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3.5 text-slate-400">📱</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 placeholder-slate-300"
                                placeholder="+51 999 999 999"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">
                            * Ingresa tu número completo con código de país (Ej: +51 para Perú).
                        </p>
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={updating} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                        {updating ? "Guardando..." : saveSuccess ? "¡Guardado con Éxito!" : "Guardar Información"}
                    </button>
                </div>
            </form>
        </div>
      </div>

      {/* Modal Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cerrar Sesión?</h3>
            <div className="flex gap-3 mt-6">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl font-bold text-gray-600">Cancelar</button>
                <button onClick={handleLogout} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}