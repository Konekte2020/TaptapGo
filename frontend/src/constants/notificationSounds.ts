/**
 * Sons de notification pour les demandes de course (chauffeur).
 * Fichiers locaux dans assets/sounds/ pour éviter les 404 des URLs externes.
 */

export interface NotificationSoundOption {
  id: number;
  label: string;
  /** Source locale (require) pour lecture fiable */
  source: number;
}

export const NOTIFICATION_SOUNDS: NotificationSoundOption[] = [
  { id: 0, label: 'Son 1 (klè)', source: require('../../assets/sounds/beep1.wav') },
  { id: 1, label: 'Son 2 (dou)', source: require('../../assets/sounds/beep2.wav') },
  { id: 2, label: 'Son 3 (notifikasyon)', source: require('../../assets/sounds/beep3.wav') },
  { id: 3, label: 'Son 4 (kout)', source: require('../../assets/sounds/beep4.wav') },
  { id: 4, label: 'Son 5 (alerte)', source: require('../../assets/sounds/beep5.wav') },
];

export const DEFAULT_SOUND_INDEX = 0;
