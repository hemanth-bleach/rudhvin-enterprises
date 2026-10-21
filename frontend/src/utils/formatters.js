export function formatINR(val, includeDecimals = true) {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  });
}

export function formatDate(dateStr, format = 'short') {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';

  if (format === 'short') {
    return d.toLocaleDateString('en-GB'); // 11/08/2026
  }
  if (format === 'medium') {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // 11 Aug 2026
  }
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return {
        label: 'Paid',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'partially_paid':
      return {
        label: 'Partially Paid',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'issued':
    case 'pending':
      return {
        label: 'Pending',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'draft':
      return {
        label: 'Draft',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400'
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}
