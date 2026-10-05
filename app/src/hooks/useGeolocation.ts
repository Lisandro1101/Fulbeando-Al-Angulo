import { useState, useCallback } from 'react';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'La geolocalización no está soportada en tu navegador', loading: false }));
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
        });
      },
      (error) => {
        let errorMessage = 'Error al obtener ubicación';
        if (error.code === error.PERMISSION_DENIED) errorMessage = 'Permiso de ubicación denegado';
        else if (error.code === error.POSITION_UNAVAILABLE) errorMessage = 'Ubicación no disponible';
        else if (error.code === error.TIMEOUT) errorMessage = 'Tiempo de espera agotado';
        
        setLocation(prev => ({ ...prev, error: errorMessage, loading: false }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  return { location, requestLocation };
};
