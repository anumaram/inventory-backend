function generateInvoiceId(date = new Date(), sequence = 0) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const seq = sequence > 0 ? `-${String(sequence).padStart(2, '0')}` : '';
  return `INV-${yyyy}${mm}${dd}-${rand}${seq}`;
}

module.exports = { generateInvoiceId };

