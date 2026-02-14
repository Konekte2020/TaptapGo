/**
 * Joue un son de préécoute (preview) pour les notifications.
 * Utilisé dans Paramètres quand le chauffeur choisit un son.
 * Accepte une source locale (require) pour éviter les 404.
 */

let Audio: {
  setAudioModeAsync: (opts: object) => Promise<void>;
  Sound: {
    createAsync: (src: { uri: string } | number, opts?: object) => Promise<{
      sound: { playAsync: () => Promise<void>; unloadAsync: () => Promise<void> };
    }>;
  };
} | null = null;

try {
  const av = require('expo-av');
  Audio = av.Audio;
} catch {
  // expo-av optionnel
}

export async function playNotificationPreview(source: number | null): Promise<void> {
  if (!Audio || source == null) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentMode: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      source as unknown as object,
      { shouldPlay: true }
    );
    await sound.playAsync();
    setTimeout(() => {
      sound.unloadAsync().catch(() => {});
    }, 3000);
  } catch (e) {
    console.warn('playNotificationPreview:', e);
  }
}
