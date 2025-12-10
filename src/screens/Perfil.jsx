import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { ArrowLeftOnRectangleIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Perfil() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Estado para controlar el modo edición
  const [isEditing, setIsEditing] = useState(false);

  // Estados del formulario
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
  const [phone, setPhone] = useState(""); 

  // --- LOGICA DE USUARIO AUTOMÁTICO ---
  // Cada vez que cambia el nombre completo, recalculamos el usuario
  // Regla: Primer nombre + Primer apellido (o segunda palabra)
  useEffect(() => {
    if (isEditing && fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 1) {
        // Tomamos la primera palabra (Nombre)
        let newUsername = parts[0];
        // Si hay más palabras, tomamos la segunda (asumiendo que es el apellido o segundo nombre)
        if (parts.length >= 2) {
          newUsername += " " + parts[1];
        }
        // Lo convertimos a un formato limpio (opcional, pero se ve mejor como usuario)
        setUsername(newUsername); 
      }
    }
  }, [fullName, isEditing]);

  // 1. Cargar datos al entrar
  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select(`username, website, full_name, phone`)
        .eq('id', user.id)
        .maybeSingle();

      if (!ignore && data) {
        if (data.username) setUsername(data.username);
        if (data.full_name) setFullName(data.full_name);
        setPhone(data.phone || "");
      } else if (!ignore && !data) {
        const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name;
        if (metaName && !fullName) setFullName(metaName);
        // El username se calculará solo con el efecto de arriba
      }
      setLoading(false);
    }
    if (user) getProfile();
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
      phone,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      await supabase.auth.updateUser({
        data: { full_name: fullName, username: username }
      });
      setSaveSuccess(true);
      setIsEditing(false); // Volver a modo lectura
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
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return "US";
  };

  return (
    <div className="h-full w-full bg-slate-100 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 z-0">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-full">
        
        {/* COLUMNA IZQUIERDA (Tarjeta Visual) */}
        <div className="md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full">
                <div className="w-28 h-28 rounded-full border-4 border-indigo-500 shadow-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold mb-5 mx-auto">
                    {getInitials()}
                </div>
                
                <h2 className="text-xl font-bold mb-1 truncate px-2">{fullName || "Usuario"}</h2>
                <p className="text-indigo-300 text-xs mb-6 font-mono">{user?.email}</p>
                
                <div className="mb-8 w-full">
                    {phone ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-xs text-green-400 font-bold mb-1">📱 SMS Activos</p>
                            <p className="text-[10px] text-slate-300">{phone}</p>
                        </div>
                    ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-xs text-yellow-400 font-bold mb-1">Sin Celular</p>
                            <p className="text-[10px] text-slate-300">Configura tu número para recibir alertas.</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-sm font-bold transition-all border border-red-600/20 flex items-center justify-center gap-2 group">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
                    Cerrar Sesión
                </button>
            </div>
        </div>

        {/* COLUMNA DERECHA (Formulario) */}
        <div className="md:w-2/3 p-8 md:p-12 bg-white flex flex-col justify-center overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
                    <p className="text-slate-500 text-sm">Gestiona tu información personal</p>
                </div>
                
                {/* BOTÓN EDITAR (Solo visible si no se está editando) */}
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                        Editar
                    </button>
                )}
            </div>

            <form onSubmit={updateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cuenta (Email)</label>
                        <input disabled value={user?.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm font-mono cursor-not-allowed" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                        <input 
                            type="text" 
                            disabled={!isEditing}
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold transition-all ${
                                isEditing 
                                ? "bg-white border-2 border-indigo-100 focus:border-indigo-500 text-slate-800 shadow-sm" 
                                : "bg-transparent border border-transparent text-slate-700 px-0 py-0 text-lg"
                            }`}
                            placeholder="Ingresa tu nombre y apellido" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Usuario <span className="text-[10px] lowercase font-normal">(automático)</span>
                        </label>
                        <input 
                            type="text" 
                            disabled={true} // Siempre deshabilitado porque es automático
                            value={username} 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">Celular (Alertas)</label>
                        <div className="relative">
                            <input
                                type="tel"
                                disabled={!isEditing}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold transition-all ${
                                    isEditing 
                                    ? "bg-white border-2 border-indigo-100 focus:border-indigo-500 text-slate-800 shadow-sm" 
                                    : "bg-transparent border border-transparent text-slate-700 px-0 py-0"
                                }`}
                                placeholder="+51 999 999 999"
                            />
                            {!isEditing && !phone && <span className="text-slate-400 text-sm italic">No configurado</span>}
                        </div>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN (Solo en modo edición) */}
                {isEditing && (
                    <div className="pt-4 flex gap-3 animate-fade-in-up">
                        <button 
                            type="button" 
                            onClick={() => { setIsEditing(false); /* Opcional: Resetear cambios */ }}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={updating} 
                            className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            {updating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <CheckIcon className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Mensaje de éxito flotante */}
                {saveSuccess && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
                        <CheckIcon className="w-5 h-5" />
                        <span>¡Guardado correctamente!</span>
                    </div>
                )}
            </form>
        </div>
      </div>

      {/* Modal Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cerrar Sesión?</h3>
            <div className="flex gap-3 mt-6">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Cancelar</button>
                <button onClick={handleLogout} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}