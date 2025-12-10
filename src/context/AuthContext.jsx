// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js'; // Verifica que la ruta a tu cliente sea correcta

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 1. Recuperar sesión al cargar la app y escuchar cambios
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error obteniendo sesión:', error);
      }
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Opcional: Si la sesión expira o cambia, podrías redirigir aquí
      if (_event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2. Login con Supabase
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw error;

      console.log('✅ Login exitoso:', data.user.email);
      setUser(data.user);
      navigate('/dashboard'); // Redirige al dashboard tras login
      return { success: true };

    } catch (error) {
      console.error('❌ Error en login:', error.message);
      setError(error.message); // Muestra mensaje legible al usuario
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // 3. Registro con Supabase (VERSIÓN CORREGIDA Y ROBUSTA)
  const register = async (email, password, username) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📝 Iniciando registro para:', email);

      // A. Crear usuario en Auth (y guardar metadata básica)
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username: username, // Guardamos esto en auth.users por seguridad
            full_name: username
          },
          emailRedirectTo: window.location.origin + '/dashboard'
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en Auth.');
      }

      console.log('✅ Usuario Auth creado ID:', authData.user.id);

      // B. Verificar si hay sesión activa (si no, es porque requiere confirmar email)
      if (!authData.session) {
        console.log('⚠️ Confirmación de email requerida por Supabase');
        setLoading(false);
        return { 
          success: true, 
          message: 'Revisa tu email para confirmar tu cuenta.',
          needsConfirmation: true
        };
      }

      // C. Crear registro en la tabla 'profiles' (Solo si hay sesión)
      // Usamos 'upsert' en lugar de 'insert' para evitar errores si el usuario ya se creó parcialmente
      if (username) {
        const { error: profileError } = await supabase
          .from('profiles') // Asegúrate que tu tabla se llama 'profiles' o 'usuarios'
          .upsert({
            id: authData.user.id,
            username: username,
            // Agrega aquí otros campos si tu tabla los requiere
            // created_at: new Date() // Supabase suele poner esto automático
          }, { onConflict: 'id' }); // Si el ID ya existe, actualiza en vez de fallar

        if (profileError) {
          // Si falla el perfil, no bloqueamos todo, pero lo avisamos en consola
          console.error('⚠️ Usuario creado, pero error al guardar perfil:', profileError.message);
        } else {
          console.log('✅ Perfil guardado en base de datos pública');
        }
      }

      // D. Todo listo, actualizar estado y redirigir
      setUser(authData.user);
      navigate('/dashboard');
      return { success: true };

    } catch (error) {
      console.error('❌ Error fatal en registro:', error.message);
      setError(error.message);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // 4. Logout
  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      navigate('/auth'); // Te manda al login
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('❌ Error en logout:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = { 
    user, 
    loading, 
    error, 
    login, 
    logout, 
    register, 
    isAuthenticated: !!user 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Componente Wrapper para proteger rutas
export const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};