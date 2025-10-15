import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { DebtProvider } from "./context/DebtContext.jsx";
import AuthScreen from "./screens/AuthScreen.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import Deudas from "./screens/Deudas.jsx";
import DebtDetail from "./screens/DebtDetail.jsx";
import Recordatorios from "./screens/Recordatorios.jsx";
import Perfil from "./screens/Perfil.jsx";
import MainLayout from "./components/layout/MainLayout.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
// import ResetPasswordPage from "./pages/ResetPasswordPage.jsx"; // ⚠️ Descomentar cuando crees el archivo
import { getUserDebts, createDebt, markPaymentAsPaid } from "./services/debtServices";

// Componente para redireccionar si ya está autenticado
const AuthRedirect = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <AuthScreen />;
};

function AppContent() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ✅ Cargar deudas desde Supabase cuando el usuario inicie sesión
  useEffect(() => {
    const loadDebts = async () => {
      if (user) {
        console.log('📥 Cargando deudas desde Supabase...');
        setLoading(true);
        const result = await getUserDebts();
        
        if (result.success) {
          setDebts(result.data);
          console.log('✅ Deudas cargadas:', result.data.length);
        } else {
          console.error('❌ Error cargando deudas:', result.error);
        }
        setLoading(false);
      } else {
        setDebts([]);
        setLoading(false);
      }
    };

    loadDebts();
  }, [user]);

  // ✅ Agregar deuda a Supabase
  const handleAddDebt = async (newDebt) => {
    console.log("🎯 Agregando deuda a Supabase:", newDebt);
    
    const result = await createDebt(newDebt);
    
    if (result.success) {
      console.log('✅ Deuda creada en Supabase');
      // Recargar deudas
      const debtsResult = await getUserDebts();
      if (debtsResult.success) {
        setDebts(debtsResult.data);
      }
    } else {
      console.error('❌ Error creando deuda:', result.error);
      alert('Error al crear la deuda: ' + result.error);
    }
  };

  // ✅ Marcar como pagado en Supabase
  const handleMarkAsPaid = async (debtId, paymentId) => {
    console.log("💰 Marcando como pagado en Supabase:", { debtId, paymentId });
    
    const result = await markPaymentAsPaid(paymentId);
    
    if (result.success) {
      console.log('✅ Pago marcado en Supabase');
      // Recargar deudas
      const debtsResult = await getUserDebts();
      if (debtsResult.success) {
        setDebts(debtsResult.data);
      }
    } else {
      console.error('❌ Error marcando pago:', result.error);
      alert('Error al marcar el pago: ' + result.error);
    }
  };

  if (loading && user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Cargando deudas...
      </div>
    );
  }

  return (
    <DebtProvider>
      <Routes>
        {/* Ruta de autenticación */}
        <Route path="/auth" element={<AuthRedirect />} />
        
        {/* Ruta de recuperación de contraseña - COMENTADO TEMPORALMENTE */}
        {/* <Route path="/reset-password" element={<ResetPasswordPage />} /> */}
        
        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  debts={debts}
                  onAddDebt={handleAddDebt}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              }
            />
            <Route 
              path="/deudas" 
              element={<Deudas debts={debts} onMarkAsPaid={handleMarkAsPaid} />} 
            />
            <Route 
              path="/deudas/:debtId" 
              element={<DebtDetail debts={debts} onMarkAsPaid={handleMarkAsPaid} />} 
            />
            <Route path="/recordatorios" element={<Recordatorios />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Route>

        {/* Ruta raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Redirigir rutas no encontradas */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </DebtProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;