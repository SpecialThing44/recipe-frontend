const FRACTIONAL_UNITS = new Set(['cup', 'piece', 'tablespoon', 'teaspoon']);
const FRACTIONS = [
  { value: 0, label: '' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 1 / 2, label: '1/2' },
  { value: 2 / 3, label: '2/3' },
  { value: 3 / 4, label: '3/4' },
  { value: 1, label: '' },
];

export function formatQuantityAmount(amount: number, unit: string): string {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (!FRACTIONAL_UNITS.has(unit.toLowerCase())) {
    return String(roundedAmount);
  }

  const wholeAmount = Math.floor(amount);
  const fractionalAmount = amount - wholeAmount;
  const nearestFraction = FRACTIONS.reduce((nearest, fraction) =>
    Math.abs(fraction.value - fractionalAmount) < Math.abs(nearest.value - fractionalAmount)
      ? fraction
      : nearest
  );

  if (Math.abs(nearestFraction.value - fractionalAmount) > 0.02 + Number.EPSILON) {
    return String(roundedAmount);
  }

  const displayedWholeAmount = nearestFraction.value === 1 ? wholeAmount + 1 : wholeAmount;
  if (!nearestFraction.label) {
    return String(displayedWholeAmount);
  }
  return displayedWholeAmount > 0
    ? `${displayedWholeAmount} ${nearestFraction.label}`
    : nearestFraction.label;
}
