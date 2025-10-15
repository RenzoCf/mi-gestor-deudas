import React from 'react';

function Card({ title, value, isCurrency = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <p className="mt-2 text-3xl font-bold text-gray-800">
        {isCurrency && 'S/ '}
        {value}
      </p>
    </div>
  );
}

function SummaryCards({ summaryData, onUpcomingClick }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Total a pagar" value={summaryData.totalToPay} isCurrency />
      <Card title="Cuotas pendientes" value={summaryData.pendingInstallments} />
      <Card
        title="Próximos vencimientos"
        value={summaryData.upcomingPaymentsCount}
        onClick={onUpcomingClick}
      />
    </div>
  );
}

export default SummaryCards;