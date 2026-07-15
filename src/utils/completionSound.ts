const COMPLETION_SOUND_URL = '/plugins/pinch/audio/correct.mp3';
const CUSTOM_AUDIO_BASE_URL = '/plugins/pinch/audio/custom/';
let completionSound: HTMLAudioElement | null = null;
const customFocusAudio = new Map<string, HTMLAudioElement>();

function getCompletionSound(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  if (!completionSound) {
    completionSound = new Audio(COMPLETION_SOUND_URL);
    completionSound.preload = 'auto';
  }
  return completionSound;
}

/** Call from a click/tap handler so delayed reminders retain audio playback permission. */
export function prepareTaskCompletionSound(): void {
  const audio = getCompletionSound();
  if (!audio) {
    return;
  }

  audio.muted = true;
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  }).catch(() => {
    audio.muted = false;
  });
}

export function playTaskCompletionSound(volume = 0.1): void {
  const audio = getCompletionSound();
  if (!audio) {
    return;
  }

  try {
    audio.muted = false;
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // Ignore unsupported runtime audio environments.
  }
}

export function getCustomFocusAudioUrl(fileName: string | undefined): string | null {
  const normalized = typeof fileName === 'string' ? fileName.trim() : '';
  return normalized ? `${CUSTOM_AUDIO_BASE_URL}${encodeURIComponent(normalized)}` : null;
}

function getCustomFocusAudio(fileName: string | undefined): HTMLAudioElement | null {
  const url = getCustomFocusAudioUrl(fileName);
  if (!url || typeof Audio === 'undefined') return null;
  let audio = customFocusAudio.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    customFocusAudio.set(url, audio);
  }
  return audio;
}

/** Call from a click/tap handler before a delayed custom sound needs to play. */
export function prepareCustomFocusAudio(fileName: string | undefined): void {
  const audio = getCustomFocusAudio(fileName);
  if (!audio) return;
  audio.muted = true;
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  }).catch(() => {
    audio.muted = false;
  });
}

export function playCustomFocusAudio(fileName: string | undefined, volume = 0.3): boolean {
  const audio = getCustomFocusAudio(fileName);
  if (!audio) return false;
  try {
    audio.muted = false;
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}
