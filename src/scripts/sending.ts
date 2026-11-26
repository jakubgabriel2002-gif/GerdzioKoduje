/**
 * Animacja wysyłania formularzy: przycisk ze spinnerem i przesuwającym się błyskiem,
 * przygaszone pola, pasek postępu w komunikacie i „ptaszek” po sukcesie.
 * Style: src/styles/global.css (sekcja „Wysyłanie formularzy”).
 */

const labels = new WeakMap<HTMLButtonElement, string>();

/** Przycisk w stanie „wysyłanie”. Zwraca funkcję przywracającą oryginalną treść. */
export function buttonLoading(button: HTMLButtonElement, text = 'Wysyłanie') {
  if (!labels.has(button)) labels.set(button, button.innerHTML);
  button.disabled = true;
  button.dataset.state = 'loading';
  button.setAttribute('aria-busy', 'true');
  button.innerHTML =
    '<span class="btn__spinner" aria-hidden="true"></span>' +
    `<span>${text}</span><span class="btn__dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>`;
}

export function buttonRestore(button: HTMLButtonElement) {
  const html = labels.get(button);
  if (html !== undefined) button.innerHTML = html;
  labels.delete(button);
  delete button.dataset.state;
  button.removeAttribute('aria-busy');
  button.disabled = false;
}

/** Krótko pokazuje „Wysłane ✓” i wraca do oryginalnej treści. */
export function buttonSuccess(button: HTMLButtonElement, text = 'Wysłane', ms = 2600) {
  const html = labels.get(button) ?? button.innerHTML;
  button.dataset.state = 'success';
  button.removeAttribute('aria-busy');
  button.innerHTML = `<span class="btn__check" aria-hidden="true"></span><span>${text}</span>`;
  window.setTimeout(() => {
    labels.set(button, html);
    buttonRestore(button);
  }, ms);
}

/** Pilnuje, żeby animacja była widoczna (krótkie mignięcie wygląda jak błąd). */
export async function atLeast<T>(promise: Promise<T>, ms = 900): Promise<T> {
  const [res] = await Promise.all([promise, new Promise((r) => setTimeout(r, ms))]);
  return res;
}

/** Komunikat pod formularzem; zmiana stanu restartuje animację wejścia. */
export function setStatus(status: HTMLElement | null, state: 'loading' | 'success' | 'error', msg: string) {
  if (!status) return;
  status.dataset.state = state;
  status.textContent = msg;
  status.classList.remove('is-anim');
  void status.offsetWidth;
  status.classList.add('is-anim');
}
