import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CountryField } from '../country-field';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const options = () => [...container.querySelectorAll('[role="option"]')].map((option) => option.textContent);

async function open(locale: 'de' | 'en', onChange = vi.fn()) {
  await act(async () => root.render(<CountryField id="nationality" locale={locale} value="" onChange={onChange} />));
  await act(async () => container.querySelector<HTMLButtonElement>('#nationality')!.click());
  return onChange;
}

async function search(text: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('the nationality list (2026-10-05)', () => {
  it('names the countries in German on the German form, sorted the German way', async () => {
    await open('de');
    expect(options()).toContain('Deutschland');
    expect(options()).toContain('Südkorea');
    expect(options()).not.toContain('Germany');
    // Ä sorts with A, not after Z.
    expect(options().indexOf('Ägypten')).toBeLessThan(options().indexOf('Belgien'));
  });

  it('finds a country without its accents and sends the name shown', async () => {
    const onChange = await open('de');
    await search('osterr');
    expect(options()).toEqual(['Österreich']);

    await act(async () => {
      container.querySelector('[role="option"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('Österreich');
  });

  it('uses the everyday English names on the English form', async () => {
    await open('en');
    expect(options()).toContain('Germany');
    expect(options()).toContain('South Korea');
    expect(options()).not.toContain('Korea (the Republic of)');
  });
});
