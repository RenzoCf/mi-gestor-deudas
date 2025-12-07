import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
// Importamos el icono para el modal
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Perfil() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // ESTADO PARA EL MODAL DE LOGOUT
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select(`username, website, full_name`)
        .eq('id', user.id)
        .single();

      if (!ignore && data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setWebsite(data.website || "");
      }
      setLoading(false);
    }
    getProfile();
    return () => { ignore = true; };
  }, [user]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const updates = {
      id: user.id,
      username,
      full_name: fullName,
      website,
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
    if (username) return username.substring(0, 2).toUpperCase();
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="h-full w-full bg-slate-100 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      
      {/* FONDO DECORATIVO */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 z-0">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-full">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full">
                <div className="w-28 h-28 rounded-full border-4 border-indigo-500 shadow-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold mb-5 mx-auto transform hover:scale-105 transition-transform">
                    {getInitials()}
                </div>
                
                <h2 className="text-xl font-bold mb-1 truncate px-2">{fullName || "Usuario"}</h2>
                <p className="text-indigo-300 text-xs mb-6 font-mono">{user.email}</p>
                
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold border border-white/10 tracking-wider">ESTUDIANTE</span>
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/20 tracking-wider">ONLINE</span>
                </div>

                {/* BOTÓN CERRAR SESIÓN (Ahora abre el modal) */}
                <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-sm font-bold transition-all border border-red-600/20 flex items-center justify-center gap-2 group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Cerrar Sesión
                </button>
            </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="md:w-2/3 p-8 md:p-12 bg-white flex flex-col justify-center">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Configuración de Perfil</h1>
                <p className="text-slate-500 text-sm">Actualiza tu información personal</p>
            </div>

            <form onSubmit={updateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Cuenta vinculada</label>
                        <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                            <span className="text-lg mr-3">✉️</span>
                            <span className="text-sm font-medium">{user.email}</span>
                            <span className="ml-auto text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">FIJO</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-300"
                            placeholder="Tu nombre"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-300"
                            placeholder="@usuario"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Enlace / Web</label>
                        <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-300"
                            placeholder="https://tudominio.com"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={updating}
                        className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transform transition-all duration-300 flex items-center justify-center gap-2
                            ${saveSuccess 
                                ? "bg-green-600 hover:bg-green-700 shadow-green-500/30 scale-100" 
                                : "bg-slate-900 hover:bg-slate-800 hover:shadow-xl active:scale-[0.99]"
                            }
                            ${updating ? "opacity-75 cursor-not-allowed" : ""}
                        `}
                    >
                        {updating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Guardando...</span>
                            </>
                        ) : saveSuccess ? (
                            <>
                                <span>¡Cambios Guardados!</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </>
                        ) : (
                            <>
                                <span>Guardar Información</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
      </div>

      {/* --- MODAL CONFIRMACIÓN LOGOUT --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeftOnRectangleIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cerrar Sesión?</h3>
              <p className="text-gray-500 text-sm mb-6">
                ¿Estás seguro de que quieres salir? Tendrás que ingresar tus datos nuevamente.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 transition-colors"
                >
                  Sí, Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}