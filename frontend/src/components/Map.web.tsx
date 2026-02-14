import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  pinColor?: string;
  icon?: { type: 'ionicons'; name: string };
}

export interface MapRef {
  animateToRegion: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }, duration?: number) => void;
}

export interface MapProps {
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  region?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  markers?: MapMarker[];
  route?: Array<{ latitude: number; longitude: number }>;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: object;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  routeStrokeColor?: string;
  routeStrokeWidth?: number;
}

/**
 * Carte non disponible sur le web (react-native-maps limité).
 * Affiche une image statique OSM ou un message.
 */
export const Map = React.forwardRef<MapRef, MapProps>(function Map(_props, _ref) {
  const lat = _props.initialRegion?.latitude ?? 18.5944;
  const lng = _props.initialRegion?.longitude ?? -72.3074;
  const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x300&markers=${lat},${lng},red-pushpin`;

  return (
    <View style={[styles.map, _props.style]}>
      <View style={styles.placeholder}>
        <Text style={styles.text}>Kat disponib sou aplikasyon mobil</Text>
        <Text style={styles.subtext}>Ouvri sou telefòn ou pou wè kat la</Text>
        <View style={styles.imageContainer}>
          <Image source={{ uri: staticMapUrl }} style={styles.staticImage} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    maxWidth: 400,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  staticImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
