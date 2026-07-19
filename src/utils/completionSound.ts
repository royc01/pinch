const COMPLETION_SOUND_URL = '/plugins/pinch/audio/correct.mp3';
const STORED_AUDIO_DIRECTORY = '/data/storage/petal/pinch/audio';
let completionSound: HTMLAudioElement | null = null;
const customFocusAudio = new Map<string, HTMLAudioElement>();
const storedAudioUrls = new Map<string, Promise<string | null>>();

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

export async function getStoredFocusAudioUrl(fileName: string | undefined): Promise<string | null> {
  const normalized = typeof fileName === 'string' ? fileName.trim() : '';
  if (!normalized || typeof fetch === 'undefined' || typeof URL === 'undefined') return null;

  let pendingUrl = storedAudioUrls.get(normalized);
  if (!pendingUrl) {
    pendingUrl = fetch('/api/file/getFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${STORED_AUDIO_DIRECTORY}/${normalized}` })
    }).then(async (response) => {
      if (!response.ok) return null;
      const blob = await response.blob();
      return blob.size > 0 ? URL.createObjectURL(blob) : null;
    }).catch(() => null);
    storedAudioUrls.set(normalized, pendingUrl);
  }
  return pendingUrl;
}

export function getCustomFocusAudioUrl(fileName: string | undefined): Promise<string | null> {
  return getStoredFocusAudioUrl(fileName);
}

async function getCustomFocusAudio(fileName: string | undefined): Promise<HTMLAudioElement | null> {
  const url = await getStoredFocusAudioUrl(fileName);
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
export async function prepareCustomFocusAudio(fileName: string | undefined): Promise<void> {
  const audio = await getCustomFocusAudio(fileName);
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

export async function playCustomFocusAudio(fileName: string | undefined, volume = 0.3): Promise<boolean> {
  const audio = await getCustomFocusAudio(fileName);
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
