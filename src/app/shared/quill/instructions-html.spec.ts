import { instructionsToHtml } from './instructions-html';

describe('instructionsToHtml', () => {
  it('preserves headings, emphasis, and links', () => {
    const html = instructionsToHtml({ ops: [
      { insert: 'Prepare' }, { insert: '\n', attributes: { header: 2 } },
      { insert: 'Mix', attributes: { bold: true, italic: true } },
      { insert: ' gently', attributes: { link: 'https://example.com/?a=1&b=2' } },
      { insert: '\n' }
    ] });
    expect(html).toContain('<h2>Prepare</h2>');
    expect(html).toContain('<em><strong>Mix</strong></em>');
    expect(html).toContain('href="https://example.com/?a=1&amp;b=2"');
  });

  it('groups numbered steps and preserves nested bullets', () => {
    const html = instructionsToHtml({ ops: [
      { insert: 'First\nSecond\n', attributes: { list: 'ordered' } },
      { insert: 'Detail\n', attributes: { list: 'bullet', indent: 1 } },
      { insert: 'Third\n', attributes: { list: 'ordered' } }
    ] });
    expect(html).toBe('<ol><li>First</li><li>Second<ul><li>Detail</li></ul></li><li>Third</li></ol>');
  });

  it('escapes markup and rejects executable link and image URLs', () => {
    const html = instructionsToHtml({ ops: [
      { insert: '<script>alert(1)</script>', attributes: { link: 'javascript:alert(1)' } },
      { insert: { image: 'javascript:alert(1)' } }, { insert: '\n' }
    ] });
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('supports JSON deltas, quotes, code blocks, and instruction images', () => {
    const html = instructionsToHtml(JSON.stringify({ ops: [
      { insert: 'Tip\n', attributes: { blockquote: true } },
      { insert: 'one\ntwo\n', attributes: { 'code-block': 'plain' } },
      { insert: { image: '/image.png' } }, { insert: '\n' }
    ] }));
    expect(html).toContain('<blockquote>Tip</blockquote>');
    expect(html).toContain('<pre><code>one\ntwo</code></pre>');
    expect(html).toContain('src="/image.png"');
  });

  it('renders stored deltas with literal newlines as numbered steps', () => {
    const instructions = JSON.stringify({ ops: [
      { insert: 'Preheat oven to 300 degrees F.' },
      { insert: '\n', attributes: { list: 'ordered' } },
      { insert: 'Mix the ingredients.', attributes: { bold: true } },
      { insert: '\n', attributes: { list: 'ordered' } }
    ] }).replace(/\\n/g, '\n');

    expect(instructionsToHtml(instructions)).toBe(
      '<ol><li>Preheat oven to 300 degrees F.</li><li><strong>Mix the ingredients.</strong></li></ol>'
    );
  });

  it('supports formatted JSON with whitespace between operations', () => {
    const instructions = JSON.stringify({ ops: [{ insert: 'Cook\n' }] }, null, 2);
    expect(instructionsToHtml(instructions)).toBe('<p>Cook</p>');
  });

  it('keeps plain text and malformed JSON escaped', () => {
    expect(instructionsToHtml('Cook <slowly>')).toBe('<p>Cook &lt;slowly&gt;</p>');
    expect(instructionsToHtml('{"ops": [<invalid>]}'))
      .toBe('<p>{&quot;ops&quot;: [&lt;invalid&gt;]}</p>');
  });

});
