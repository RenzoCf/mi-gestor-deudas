// src/components/layout/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/deudas', label: 'Deudas', icon: '💰' }
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar Overlay para móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - FIJO en desktop, overlay en móvil */}
      <aside
        className={`fixed md:static z-30 h-full w-64 bg-white shadow-lg flex flex-col transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Header del Sidebar */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">Finanzas Edu</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de deudas</p>
          </div>
          <button
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            ✖️
          </button>
        </div>

        {/* Menú de navegación */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path ||
                               (item.path === '/deudas' && location.pathname.startsWith('/deudas'));
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false); // Cierra sidebar en móvil al navegar
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Usuario y logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-lg">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.email || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">Cuenta activa</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal - CON MARGEN CORRECTO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header móvil con botón de menú */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <span>☰</span>
            <span>Menú</span>
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Finanzas Edu</h2>
        </div>

        {/* Contenido scrolleable */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;