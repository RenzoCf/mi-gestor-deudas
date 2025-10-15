import React from 'react';

// Sub-componentes para los íconos
const DollarIcon = () => (
    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xl font-bold text-blue-600">$</span>
    </div>
);
const CheckIcon = () => (
    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    </div>
);
const WarningIcon = () => (
    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    </div>
);

// Sub-componente para la etiqueta de estado
const StatusBadge = ({ status }) => {
    const styles = {
        PENDIENTE: 'bg-yellow-100 text-yellow-800',
        PAGADO: 'bg-green-100 text-green-800',
        VENCIDO: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status}
        </span>
    );
};

// Sub-componente para una fila de la lista de deudas
function DebtItem({ debt }) {
    const getIcon = (status) => {
        switch (status) {
            case 'PAGADO':
                return <CheckIcon />;
            case 'VENCIDO':
                return <WarningIcon />;
            default:
                return <DollarIcon />;
        }
    };
    
    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div className="flex items-center">
                {getIcon(debt.status)}
                <div className="ml-4">
                    <p className="font-bold text-gray-800">{debt.name}</p>
                    <p className="text-sm text-gray-500">{debt.dueDate}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-lg text-gray-800">S/ {debt.amount}</p>
                <StatusBadge status={debt.status} />
            </div>
        </div>
    );
}

// Componente principal exportado
function DebtList({ debts }) {
  return (
    <div className="mt-6 space-y-4">
      {debts.map(debt => (
        <DebtItem key={debt.id} debt={debt} />
      ))}
    </div>
  );
}

export default DebtList;
