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

export function numberToWords(num) {
  if (num === null || num === undefined || num === '') return '';
  num = Number(num);
  if (isNaN(num)) return '';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
  };

  const convertThreeDigits = (n) => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str;
  };

  const convertIndianNumber = (n) => {
    let str = '';
    const crore = Math.floor(n / 10000000);
    if (crore > 0) {
      str += convertIndianNumber(crore).trim() + ' Crore ';
      n %= 10000000;
    }
    const lakh = Math.floor(n / 100000);
    if (lakh > 0) {
      str += convertTwoDigits(lakh) + 'Lakh ';
      n %= 100000;
    }
    const thousand = Math.floor(n / 1000);
    if (thousand > 0) {
      str += convertTwoDigits(thousand) + 'Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      str += convertThreeDigits(n);
    }
    return str;
  };

  const parts = Number(num).toFixed(2).split('.');
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  let result = '';
  if (integerPart > 0) {
    const intWords = convertIndianNumber(integerPart).trim();
    const prefix = integerPart === 1 ? 'Rupee ' : 'Rupees ';
    result = prefix + intWords;
  }

  if (decimalPart > 0) {
    const decWords = convertTwoDigits(decimalPart).trim();
    const paiseText = decWords + (decimalPart === 1 ? ' Paisa' : ' Paise');
    if (result) {
      result += ' and ' + paiseText;
    } else {
      result = paiseText;
    }
  }

  if (!result) {
    result = 'Rupees Zero';
  }

  return (result + ' Only').replace(/\s+/g, ' ').trim();
}
