import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { Predio } from '@/domain'
import { canchasDe } from '@/domain'
import { haversineKm } from '@/core/geo/geohash'
import { formatearMoneda } from '@/core/tiempo'

export const CENTRO_CABA = { lat: -34.6037, lng: -58.3816 }
export const ZOOM_INICIAL = 12

/** Basemap 100% Gratuito de OpenStreetMap sin API Key */
const URL_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const iconoPredio = (seleccionado: boolean): L.DivIcon =>
  L.divIcon({
    className: 'marcador-predio',
    html: `<div class="marcador-predio__punto${seleccionado ? ' es-activo' : ''}" style="width: 22px; height: 22px; border-radius: 50%; background: ${seleccionado ? '#F59E0B' : '#22C55E'}; border: 3px solid #0F172A; box-shadow: 0 0 10px ${seleccionado ? '#F59E0B' : '#22C55E'};"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  })

const iconoUsuario = (): L.DivIcon =>
  L.divIcon({
    className: 'marcador-usuario',
    html: `<div style="width: 18px; height: 18px; border-radius: 50%; background: #3B82F6; border: 3px solid #FFFFFF; box-shadow: 0 0 12px #3B82F6;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })

function EncajarVista({ predios }: { predios: Predio[] }) {
  const mapa = useMap()

  useEffect(() => {
    if (predios.length === 0) {
      mapa.setView([CENTRO_CABA.lat, CENTRO_CABA.lng], ZOOM_INICIAL)
      return
    }
    if (predios.length === 1) {
      const unico = predios[0]!
      mapa.setView([unico.geo.lat, unico.geo.lng], 15)
      return
    }
    const limites = L.latLngBounds(predios.map((p) => [p.geo.lat, p.geo.lng] as [number, number]))
    mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 15 })
  }, [mapa, predios])

  return null
}

export function MapaPredios({
  predios,
  seleccionadoId,
  alSeleccionar,
  latitudUsuario,
}: {
  predios: Predio[]
  seleccionadoId: string | null
  alSeleccionar: (id: string | null) => void
  latitudUsuario: { lat: number; lng: number } | null
}) {
  const marcadores = useMemo(
    () => predios.map((p) => ({ id: p.id, lat: p.geo.lat, lng: p.geo.lng })),
    [predios],
  )

  return (
    <MapContainer
      center={[CENTRO_CABA.lat, CENTRO_CABA.lng]}
      zoom={ZOOM_INICIAL}
      className="h-[340px] w-full overflow-hidden rounded-2xl sm:h-[440px]"
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer url={URL_TILES} attribution={ATRIBUCION} />

      {latitudUsuario && (
        <Marker position={[latitudUsuario.lat, latitudUsuario.lng]} icon={iconoUsuario()}>
          <Popup>
            <div className="p-1 text-xs font-bold text-ink">📍 Tu ubicación actual</div>
          </Popup>
        </Marker>
      )}

      {marcadores.map((marcador) => {
        const predio = predios.find((p) => p.id === marcador.id)
        if (!predio) return null
        const distancia =
          latitudUsuario === null
            ? null
            : Math.round(haversineKm(predio.geo, latitudUsuario) * 10) / 10

        return (
          <Marker
            key={marcador.id}
            position={[marcador.lat, marcador.lng]}
            icon={iconoPredio(seleccionadoId === marcador.id)}
            eventHandlers={{
              click: () => alSeleccionar(predio.id),
            }}
          >
            <Popup>
              <div className="space-y-2 p-1 text-left">
                <div>
                  <p className="font-extrabold text-ink">{predio.nombre}</p>
                  <p className="text-xs text-ink-muted">
                    {predio.direccion} · {predio.barrio}
                  </p>
                  {distancia !== null && (
                    <p className="text-[11px] font-semibold text-pitch">
                      📍 A {distancia} km de vos
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  {canchasDe(predio).map((cancha) => (
                    <p key={cancha.id} className="text-xs text-ink-muted">
                      <span className="font-semibold text-pitch">{cancha.nombre}</span> ({cancha.tipo})
                      {cancha.techada ? ' 🌧️ Techada' : ''} · {formatearMoneda(cancha.precioHora)}/h
                    </p>
                  ))}
                </div>

                <div className="pt-1">
                  <Link
                    to={`/reservar/${predio.id}`}
                    className="btn-primary block w-full text-center py-1.5 text-xs"
                  >
                    Ver Disponibilidad
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      <EncajarVista predios={predios} />
    </MapContainer>
  )
}