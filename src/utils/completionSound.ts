export function playTaskCompletionSound(volume = 0.1): void {
  try {
    const audio = new Audio('/plugins/pinch/audio/correct.mp3');
    audio.volume = volume;
    void audio.play().catch(() => {});
  } catch {
    // Ignore unsupported runtime audio environments.
  }
}

