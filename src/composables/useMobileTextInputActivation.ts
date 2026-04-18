import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { getFrontend } from 'siyuan';

type FocusableTextInput = HTMLInputElement | HTMLTextAreaElement;

function isMobileFrontend(): boolean {
  try {
    const frontend = getFrontend();
    return frontend === 'mobile' || frontend === 'browser-mobile';
  } catch {
    return false;
  }
}

function isSupportedInputType(input: HTMLInputElement): boolean {
  const type = (input.type || 'text').toLowerCase();
  return ![
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
  ].includes(type);
}

function resolveTextInputTarget(root: HTMLElement, event: Event): FocusableTextInput | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  const candidate = target.closest('input, textarea');
  if (!(candidate instanceof HTMLInputElement) && !(candidate instanceof HTMLTextAreaElement)) {
    return null;
  }

  if (!root.contains(candidate) || candidate.hasAttribute('disabled') || candidate.hasAttribute('readonly')) {
    return null;
  }

  if (candidate instanceof HTMLInputElement && !isSupportedInputType(candidate)) {
    return null;
  }

  return candidate;
}

function focusTextInput(target: FocusableTextInput): void {
  if (document.activeElement === target) {
    return;
  }

  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

export function useMobileTextInputActivation(rootRef: Ref<HTMLElement | null>): void {
  let cleanup: (() => void) | null = null;

  onMounted(() => {
    if (!isMobileFrontend()) {
      return;
    }

    const root = rootRef.value;
    if (!root) {
      return;
    }

    const handleActivate = (event: Event) => {
      const target = resolveTextInputTarget(root, event);
      if (!target) {
        return;
      }
      focusTextInput(target);
    };

    root.addEventListener('touchend', handleActivate, true);
    root.addEventListener('pointerup', handleActivate, true);
    root.addEventListener('click', handleActivate, true);

    cleanup = () => {
      root.removeEventListener('touchend', handleActivate, true);
      root.removeEventListener('pointerup', handleActivate, true);
      root.removeEventListener('click', handleActivate, true);
    };
  });

  onBeforeUnmount(() => {
    cleanup?.();
    cleanup = null;
  });
}
