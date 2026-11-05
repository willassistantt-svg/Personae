let context: AudioContext | null = null;

/** Short two-note alert for new messages. Browsers may keep audio muted until the page had a click. */
export function chime() {
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const at = start + index * 0.12;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.3);
    });
  } catch {
    // audio is a nicety; never break the chat over it
  }
}
