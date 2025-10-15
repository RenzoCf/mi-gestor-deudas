import React from "react";
import { useNavigate } from "react-router-dom";

function Deudas({ debts }) {
  const navigate = useNavigate();

  // Agrupar por entidad
  const entities = [...new Set(debts.map(d => d.lender))];

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Deudas por Entidad</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {entities.length === 0 ? (
          <div className="col-span-3">
            <p className="text-center text-gray-500 py-10">
              No hay deudas registradas. Agrega una desde el Dashboard.
            </p>
          </div>
        ) : (
          entities.map(entity => {
            const relatedDebts = debts.filter(d => d.lender === entity);

            // Calcular montos
            const totalAmount = relatedDebts.reduce((a, b) => a + b.totalAmount, 0);
            const totalPaid = relatedDebts.reduce(
              (a, b) => a + (b.payments?.filter(p => p.paid).length || 0) * b.cuota,
              0
            );
            const totalPending = totalAmount - totalPaid;

            // Verificar si todas las deudas están 100% pagadas
            const allPaid = relatedDebts.every(debt =>
              debt.payments?.every(p => p.paid)
            );

            return (
              <div
                key={entity}
                className="bg-white shadow-md p-6 rounded-lg cursor-pointer hover:shadow-xl transition-all"
                onClick={() => {
                  const debt = relatedDebts[0];
                  navigate(`/deudas/${debt.id}`);
                }}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {entity}
                </h3>

                <div className="space-y-2">
                  <p className="text-gray-700">
                    Monto total:{" "}
                    <b className="text-gray-900">S/ {totalAmount.toFixed(2)}</b>
                  </p>
                  <p className="text-gray-700">
                    Pagado:{" "}
                    <b className="text-green-600">S/ {totalPaid.toFixed(2)}</b>
                  </p>
                  <p className="text-gray-700">
                    Pendiente:{" "}
                    <b className="text-yellow-600">
                      S/ {totalPending.toFixed(2)}
                    </b>
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  {allPaid ? (
                    <p className="text-sm text-green-600 font-semibold">
                      ✅ Deuda cancelada al 100%
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {relatedDebts.length}{" "}
                      {relatedDebts.length === 1 ? "deuda" : "deudas"}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Deudas;
