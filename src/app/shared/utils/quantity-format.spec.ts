import { formatQuantityAmount } from './quantity-format';

describe('formatQuantityAmount', () => {
  it('formats supported units as familiar fractions within the tolerance', () => {
    expect(formatQuantityAmount(1.66, 'cup')).toBe('1 2/3');
    expect(formatQuantityAmount(0.34, 'Teaspoon')).toBe('1/3');
    expect(formatQuantityAmount(2.49, 'piece')).toBe('2 1/2');
    expect(formatQuantityAmount(0.76, 'tablespoon')).toBe('3/4');
  });

  it('keeps decimals outside the tolerance', () => {
    expect(formatQuantityAmount(1.7, 'cup')).toBe('1.7');
  });

  it('keeps decimals for other units', () => {
    expect(formatQuantityAmount(1.66, 'gram')).toBe('1.66');
  });
});
