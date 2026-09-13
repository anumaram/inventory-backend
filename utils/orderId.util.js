function generateOrderId(date = new Date(), sequence = 0) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = pad(Math.floor(date.getMilliseconds() / 10));
  const seq = sequence > 0 ? pad(sequence) : '';
  return `ORD${dd}${mm}${hh}${min}${ss}${ms}${seq}`;
}

module.exports = { generateOrderId };
