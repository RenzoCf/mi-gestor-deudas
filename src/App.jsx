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
import { getUserDebts, createDebt, markPaymentAsPaid, deleteDebt, updateDebtWithPayments } from "./services/debtServices";

// Componente para mostrar toast de confirmación
function ConfirmationToast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-fade-in">
      {message}
    </div>
  );
}

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
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const { user } = useAuth();

  // ✅ Función centralizada para recargar deudas
  const reloadDebts = async () => {
    console.log('🔄 Recargando deudas...');
    const result = await getUserDebts();
    if (result.success) {
      setDebts(result.data);
      console.log('✅ Deudas recargadas:', result.data.length);
      return true;
    } else {
      console.error('❌ Error recargando deudas:', result.error);
      return false;
    }
  };

  // ✅ Cargar deudas desde Supabase cuando el usuario inicie sesión
  useEffect(() => {
    const loadDebts = async () => {
      if (user) {
        console.log('📥 Cargando deudas iniciales desde Supabase...');
        setLoading(true);
        await reloadDebts();
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
      setConfirmationMessage('✅ Deuda creada correctamente');
      // Recargar deudas INMEDIATAMENTE
      await reloadDebts();
    } else {
      console.error('❌ Error creando deuda:', result.error);
      setConfirmationMessage('❌ Error al crear la deuda');
    }
  };

  // ✅ Marcar como pagado en Supabase
  const handleMarkAsPaid = async (debtId, paymentId) => {
    console.log("💰 Marcando como pagado en Supabase:", { debtId, paymentId });
    
    const result = await markPaymentAsPaid(paymentId);
    
    if (result.success) {
      console.log('✅ Pago marcado en Supabase');
      setConfirmationMessage('✅ Pago marcado correctamente');
      // Recargar deudas INMEDIATAMENTE
      await reloadDebts();
    } else {
      console.error('❌ Error marcando pago:', result.error);
      setConfirmationMessage('❌ Error al marcar el pago');
    }
  };

  // ✅ EDITAR DEUDA CON RECÁLCULO DE CUOTAS - RECARGA INMEDIATA
  const handleEditDebt = async (debtId, editedDebt) => {
    console.log("✏️ Editando deuda en Supabase:", { debtId, editedDebt });
    
    try {
      const result = await updateDebtWithPayments(debtId, {
        name: editedDebt.name,
        lender: editedDebt.lender,
        totalAmount: editedDebt.totalAmount,
        cuota: editedDebt.cuota,
        installments: editedDebt.installments,
        startDate: editedDebt.startDate,
        principal: editedDebt.principal || editedDebt.totalAmount,
        interestRate: editedDebt.interestRate || 0,
        totalInterest: editedDebt.totalInterest || 0,
      });
      
      if (result.success) {
        console.log('✅ Deuda editada y cuotas recalculadas en Supabase');
        setConfirmationMessage('✅ Deuda actualizada correctamente');
        
        // 🔥 RECARGAR INMEDIATAMENTE (sin setTimeout)
        await reloadDebts();
        console.log('🔄 Deudas recargadas inmediatamente después de editar');
      } else {
        console.error('❌ Error editando deuda:', result.error);
        setConfirmationMessage('❌ Error al editar la deuda');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setConfirmationMessage('❌ Error al editar la deuda');
    }
  };

  // ✅ Eliminar deuda en Supabase
  const handleDeleteDebt = async (debtId) => {
    console.log("🗑️ Eliminando deuda en Supabase:", debtId);
    
    try {
      const result = await deleteDebt(debtId);
      
      if (result.success) {
        console.log('✅ Deuda eliminada en Supabase');
        setConfirmationMessage('✅ Deuda eliminada correctamente');
        
        // Recargar deudas INMEDIATAMENTE
        await reloadDebts();
      } else {
        console.error('❌ Error eliminando deuda:', result.error);
        setConfirmationMessage('❌ Error al eliminar la deuda');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setConfirmationMessage('❌ Error al eliminar la deuda');
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
      {/* Toast de confirmación */}
      {confirmationMessage && (
        <ConfirmationToast 
          message={confirmationMessage}
          onClose={() => setConfirmationMessage("")}
        />
      )}

      <Routes>
        {/* Ruta de autenticación */}
        <Route path="/auth" element={<AuthRedirect />} />
        
        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  debts={debts}
                  onAddDebt={handleAddDebt}
                  onUpdateDebt={handleEditDebt}
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
              element={
                <DebtDetail 
                  debts={debts} 
                  onMarkAsPaid={handleMarkAsPaid}
                  onEditDebt={handleEditDebt}
                  onDeleteDebt={handleDeleteDebt}
                />
              } 
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