import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Swords, Share2 } from 'lucide-react'
import type { Usuario } from '@/domain'
import { obtenerUsuario } from '@/modules/usuarios/repositorio'
import { CargandoFulbeando } from '@/modules/ui/overlays'
import { useDatosCarta } from '../useDatosCarta'
import { TarjetaJugador } from '../componentes/TarjetaJugador'

/**
 * Carta publica de otro jugador, alcanzable por el link que se comparte
 * (`/carta/:uid`). Es de solo lectura: no edita nada, solo muestra la ficha.
 *
 * Requiere sesion (las reglas de `usuarios` son `isSignedIn()`), asi que un
 * link compartido solo se ve estando logueado.
 */
export default function CartaPublica() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const { datos } = useDatosCarta(usuario)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    if (!uid) {
      setCargando(false)
      return
    }
    obtenerUsuario(uid)
      .then((u) => {
        if (vivo) setUsuario(u)
      })
      .catch(console.error)
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [uid])

  const compartir = async () => {
    const url = window.location.href
    const texto = `Mirá la carta de ${datos.nombre} en Fulbeando: ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fulbeando', text: texto, url })
        return
      } catch {
        /* el usuario cancelo: no hacemos nada */
      }
    }
    await navigator.clipboard.writeText(url)
  }

  return (
    <div className="h-full flex flex-col bg-canvas font-sans text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-8 flex flex-col items-center">
        <button
          onClick={() => navigate(-1)}
          className="self-start flex items-center gap-2 text-zinc-400 hover:text-white active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Volver
        </button>

        {cargando ? (
          <CargandoFulbeando />
        ) : !usuario ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
            <p className="font-bold text-lg text-zinc-200">No encontramos esta carta</p>
            <p className="text-sm">Puede que el jugador ya no exista o el link esté roto.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-min my-2 sm:my-4 scale-[0.85] sm:scale-100 origin-center transition-transform">
              <TarjetaJugador datos={datos} />
            </div>

            <div className="w-full max-w-xs sm:max-w-sm mt-2 sm:mt-4 space-y-3 shrink-0">
              <button
                onClick={() => navigate('/partidos')}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition cursor-pointer"
              >
                <Swords className="w-4 h-4" /> Desafiar / jugar
              </button>
              <button
                onClick={compartir}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold py-3.5 rounded-xl active:scale-95 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Compartir esta carta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
