export const MIKU_AUDIO_SRC = '/assets/aistudio/mikudayooooooo_a7895345.mp3';

let welcomeAttempted = false;
let welcomeCompleted = false;

/**
 * Plays the Hatsune Miku "Mikudayo~" audio clip.
 * Spawns a lightweight Audio instance per call so rapid/spam clicks overlap cleanly.
 */
export function playMikuAudio(volume = 0.75): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  welcomeCompleted = true;

  try {
    const audio = new Audio(MIKU_AUDIO_SRC);
    audio.volume = volume;
    audio.preload = 'auto';

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore browser autoplay restrictions silently
      });
    }
  } catch {
    // Ignore audio construction errors
  }
}

/**
 * Plays the greeting sound once when the website first opens.
 * If the browser blocks autoplay before user interaction, schedules playback on the first gesture
 * (unless the user has already triggered Miku's audio directly).
 */
export function playWelcomeMikuOnce(): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  if (welcomeAttempted) return;
  welcomeAttempted = true;

  try {
    const audio = new Audio(MIKU_AUDIO_SRC);
    audio.volume = 0.75;
    audio.preload = 'auto';

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          welcomeCompleted = true;
        })
        .catch(() => {
          const handleFirstGesture = () => {
            window.removeEventListener('pointerdown', handleFirstGesture, true);
            window.removeEventListener('keydown', handleFirstGesture, true);
            // Defer one microtask so direct clicks on Miku images set welcomeCompleted first
            setTimeout(() => {
              if (!welcomeCompleted) {
                playMikuAudio();
              }
            }, 0);
          };

          window.addEventListener('pointerdown', handleFirstGesture, true);
          window.addEventListener('keydown', handleFirstGesture, true);
        });
    } else {
      welcomeCompleted = true;
    }
  } catch {
    // Ignore audio errors
  }
}
