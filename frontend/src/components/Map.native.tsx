import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  pinColor?: string;
  /** Icône personnalisée (ex: chauffeur moto/car) */
  icon?: { type: 'ionicons'; name: keyof typeof Ionicons.glyphMap };
}

export interface MapRef {
  /** Centre la carte sur une position */
  animateToRegion: (region: Region, duration?: number) => void;
}

export interface MapProps {
  initialRegion?: Region;
  /** Region contrôlée (si fourni, la carte suit cette region) */
  region?: Region;
  markers?: MapMarker[];
  route?: Array<{ latitude: number; longitude: number }>;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: object;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  /** Couleur du tracé de la route */
  routeStrokeColor?: string;
  routeStrokeWidth?: number;
}

const DEFAULT_REGION: Region = {
  latitude: 18.5944,
  longitude: -72.3074,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    initialRegion = DEFAULT_REGION,
    region,
    markers = [],
    route = [],
    onMapPress,
    style,
    showsUserLocation = true,
    showsMyLocationButton = true,
    showsCompass = true,
    showsScale = true,
    routeStrokeColor = '#007AFF',
    routeStrokeWidth = 4,
  },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r: Region, duration = 1000) => {
      mapRef.current?.animateToRegion(r, duration);
    },
  }));

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (onMapPress) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onMapPress({ latitude, longitude });
    }
  };

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={initialRegion}
      region={region}
      onPress={handleMapPress}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
      showsCompass={showsCompass}
      showsScale={showsScale}
      loadingEnabled
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          pinColor={marker.icon ? undefined : (marker.pinColor ?? Colors.primary)}
        >
          {marker.icon?.type === 'ionicons' ? (
            <View style={styles.customMarker}>
              <Ionicons name={marker.icon.name} size={20} color="#FFF" />
            </View>
          ) : null}
        </Marker>
      ))}

      {route.length > 0 && (
        <Polyline
          coordinates={route}
          strokeColor={routeStrokeColor}
          strokeWidth={routeStrokeWidth}
        />
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
