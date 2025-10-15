// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

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

  // Recuperar sesión al iniciar y escuchar cambios
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Error obteniendo sesión:', error);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Login con Supabase
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
      setLoading(false);
      navigate('/dashboard');
      return { success: true };

    } catch (error) {
      console.error('❌ Error en login:', error.message);
      setError(error.message);
      setLoading(false);
      return { success: false, error };
    }
  };

  // Registro con Supabase
  const register = async (email, password, username) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📝 Iniciando registro para:', email);

      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username: username
          },
          emailRedirectTo: window.location.origin + '/dashboard'
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      console.log('✅ Usuario creado en auth:', authData.user.id);

      // 2. CRÍTICO: Verificar si la sesión está activa
      if (authData.session) {
        console.log('✅ Sesión activa, creando perfil...');
        
        // 3. Crear perfil con la sesión autenticada
        if (username) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              username: username
            });

          if (profileError) {
            console.error('❌ Error creando perfil:', profileError);
          } else {
            console.log('✅ Perfil creado exitosamente');
          }
        }

        // Usuario autenticado, ir al dashboard
        setUser(authData.user);
        setLoading(false);
        navigate('/dashboard');
        return { success: true };
      } else {
        // No hay sesión (confirmación de email requerida)
        console.log('⚠️ Confirmación de email requerida');
        alert('Por favor revisa tu email y confirma tu cuenta. Luego podrás iniciar sesión.');
        setLoading(false);
        return { 
          success: true, 
          message: 'Revisa tu email para confirmar tu cuenta',
          needsConfirmation: true
        };
      }

    } catch (error) {
      console.error('❌ Error en registro:', error.message);
      setError(error.message);
      setLoading(false);
      return { success: false, error };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/auth');
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('❌ Error en logout:', error);
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

// Componente para proteger rutas
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};