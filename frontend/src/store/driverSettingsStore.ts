import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SOUND_INDEX } from '../constants/notificationSounds';

const RIDE_SOUND_KEY = 'driver_ride_sound_enabled';
const RIDE_SOUND_INDEX_KEY = 'driver_ride_sound_index';
const RIDE_VIBRATION_KEY = 'driver_ride_vibration_enabled';

interface DriverSettingsState {
  rideSoundEnabled: boolean;
  rideSoundIndex: number;
  vibrationEnabled: boolean;
  loaded: boolean;
  setRideSoundEnabled: (enabled: boolean) => Promise<void>;
  setRideSoundIndex: (index: number) => Promise<void>;
  setVibrationEnabled: (enabled: boolean) => Promise<void>;
  load: () => Promise<void>;
}

export const useDriverSettingsStore = create<DriverSettingsState>((set, get) => ({
  rideSoundEnabled: true,
  rideSoundIndex: DEFAULT_SOUND_INDEX,
  vibrationEnabled: true,
  loaded: false,

  setRideSoundEnabled: async (enabled: boolean) => {
    set({ rideSoundEnabled: enabled });
    try {
      await AsyncStorage.setItem(RIDE_SOUND_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('DriverSettings: could not save ride sound preference', e);
    }
  },

  setRideSoundIndex: async (index: number) => {
    set({ rideSoundIndex: index });
    try {
      await AsyncStorage.setItem(RIDE_SOUND_INDEX_KEY, String(index));
    } catch (e) {
      console.warn('DriverSettings: could not save sound index', e);
    }
  },

  setVibrationEnabled: async (enabled: boolean) => {
    set({ vibrationEnabled: enabled });
    try {
      await AsyncStorage.setItem(RIDE_VIBRATION_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('DriverSettings: could not save vibration preference', e);
    }
  },

  load: async () => {
    if (get().loaded) return;
    try {
      const [soundVal, indexVal, vibVal] = await Promise.all([
        AsyncStorage.getItem(RIDE_SOUND_KEY),
        AsyncStorage.getItem(RIDE_SOUND_INDEX_KEY),
        AsyncStorage.getItem(RIDE_VIBRATION_KEY),
      ]);
      const index = indexVal !== null ? Math.max(0, Math.min(4, parseInt(indexVal, 10) || 0)) : DEFAULT_SOUND_INDEX;
      set({
        rideSoundEnabled: soundVal === null || soundVal === 'true',
        rideSoundIndex: isNaN(index) ? DEFAULT_SOUND_INDEX : index,
        vibrationEnabled: vibVal === null || vibVal === 'true',
        loaded: true,
      });
    } catch (e) {
      set({
        rideSoundEnabled: true,
        rideSoundIndex: DEFAULT_SOUND_INDEX,
        vibrationEnabled: true,
        loaded: true,
      });
    }
  },
}));
