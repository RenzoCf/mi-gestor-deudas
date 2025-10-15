import emailjs from '@emailjs/browser';

// Configura tus credenciales aquí
const SERVICE_ID = 'tu_service_id';
const TEMPLATE_ID = 'tu_template_id';
const PUBLIC_KEY = 'tu_public_key';

export const sendUrgentPaymentEmail = async (urgentPayments, userEmail) => {
  try {
    const emailContent = urgentPayments.map(p => 
      `⚠️ ${p.debtName} (${p.lender}): S/ ${p.amount.toFixed(2)} - Vence en ${p.daysLeft} día(s)`
    ).join('\n\n');

    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: userEmail,
        subject: '⚠️ ALERTA: Tienes pagos próximos a vencer',
        message: emailContent,
        payment_count: urgentPayments.length
      },
      PUBLIC_KEY
    );

    console.log("✅ Email enviado exitosamente");
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return false;
  }
};