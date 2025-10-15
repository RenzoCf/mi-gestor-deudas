import React, { useState } from 'react';

// El prop 'onAddDebt' es una función que pasaremos desde el Dashboard
// para recibir los datos de la nueva deuda.
function AddDebtForm({ onAddDebt }) {
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [monto, setMonto] = useState('');
  const [diaVencimiento, setDiaVencimiento] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el form

    // Validación simple para asegurar que los campos no estén vacíos
    if (!nombre || !entidad || !monto || !diaVencimiento || !fechaInicio) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    // Creamos un objeto con los datos de la nueva deuda
    const newDebt = {
      id: Date.now(), // Usamos un timestamp como ID temporal
      nombre,
      entidad,
      monto: parseFloat(monto),
      diaVencimiento: parseInt(diaVencimiento),
      fechaInicio,
    };

    onAddDebt(newDebt); // Enviamos la nueva deuda al componente padre (Dashboard)

    // Limpiamos el formulario para el siguiente ingreso
    setNombre('');
    setEntidad('');
    setMonto('');
    setDiaVencimiento('');
    setFechaInicio('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Registrar Nueva Deuda Mensual</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna 1 */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre de la deuda</label>
          <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Préstamo Personal" />
        </div>
        <div>
          <label htmlFor="entidad" className="block text-sm font-medium text-gray-700">Banco / Entidad</label>
          <input type="text" id="entidad" value={entidad} onChange={(e) => setEntidad(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: BCP" />
        </div>
        <div>
          <label htmlFor="monto" className="block text-sm font-medium text-gray-700">Monto Mensual (PEN)</label>
          <input type="number" id="monto" value={monto} onChange={(e) => setMonto(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: 550.00" />
        </div>
        
        {/* Columna 2 */}
        <div>
          <label htmlFor="diaVencimiento" className="block text-sm font-medium text-gray-700">Día de Vencimiento (1-31)</label>
          <input type="number" id="diaVencimiento" min="1" max="31" value={diaVencimiento} onChange={(e) => setDiaVencimiento(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: 15" />
        </div>
        <div>
          <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
          <input type="date" id="fechaInicio" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        
        {/* Botón de envío */}
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Añadir Deuda
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddDebtForm;
