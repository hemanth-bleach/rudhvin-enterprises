export function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';

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

  num = Number(num);
  if (num === 0) return 'Zero Rupees Only';

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  let words = '';

  // Crores (10,000,000)
  if (Math.floor(integerPart / 10000000) > 0) {
    words += convertTwoDigits(Math.floor(integerPart / 10000000)) + 'Crore ';
    integerPart %= 10000000;
  }

  // Lakhs (100,000)
  if (Math.floor(integerPart / 100000) > 0) {
    words += convertTwoDigits(Math.floor(integerPart / 100000)) + 'Lakh ';
    integerPart %= 100000;
  }

  // Thousands (1,000)
  if (Math.floor(integerPart / 1000) > 0) {
    words += convertTwoDigits(Math.floor(integerPart / 1000)) + 'Thousand ';
    integerPart %= 1000;
  }

  // Hundreds and remainder
  if (integerPart > 0) {
    words += convertThreeDigits(integerPart);
  }

  words = words.trim() + ' Rupees';

  if (decimalPart > 0) {
    words += ' and ' + convertTwoDigits(decimalPart).trim() + ' Paise';
  }

  words += ' Only';
  return words.replace(/\s+/g, ' ');
}
