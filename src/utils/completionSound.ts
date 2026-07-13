const COMPLETION_SOUND_URL = '/plugins/pinch/audio/correct.mp3';
let completionSound: HTMLAudioElement | null = null;

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
