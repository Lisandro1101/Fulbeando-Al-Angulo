import { useState, useCallback } from 'react';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  isFallback: boolean;
}

const FALLBACK_LAT = -34.6037; // CABA por defecto
const FALLBACK_LNG = -58.3816;

export const useGeolocation = (defaultLocation?: { lat: number, lng: number }) => {
  const defaultLat = defaultLocation?.lat ?? FALLBACK_LAT;
  const defaultLng = defaultLocation?.lng ?? FALLBACK_LNG;

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    isFallback: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, latitude: defaultLat, longitude: defaultLng, error: 'La geolocalización no está soportada en tu navegador', loading: false, isFallback: true }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          isFallback: false,
        });
      },
      (error) => {
        let errorMessage = 'Error al obtener ubicación';
        if (error.code === error.PERMISSION_DENIED) errorMessage = 'Permiso de ubicación denegado';
        else if (error.code === error.POSITION_UNAVAILABLE) errorMessage = 'Ubicación no disponible';
        else if (error.code === error.TIMEOUT) errorMessage = 'Tiempo de espera agotado';
        
        setLocation(prev => ({ ...prev, latitude: defaultLat, longitude: defaultLng, error: errorMessage, loading: false, isFallback: true }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  return { location, requestLocation, setLocation };
};
