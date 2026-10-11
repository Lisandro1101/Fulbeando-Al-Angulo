import { Building2, MessageCircle, Clock } from 'lucide-react'
import { CONTACTO_PLAN_DUENO } from '@/core/config'
import { nombreCompleto } from '@/domain'
import { useSesion } from '@/modules/auth/useSesion'

const MENSAJE_WHATSAPP = encodeURIComponent(
  'Hola, me registre como dueno de predio en Fulbeando y quiero activar mi plan.',
)

const LINK_WHATSAPP = `https://wa.me/${CONTACTO_PLAN_DUENO.whatsapp}?text=${MENSAJE_WHATSAPP}`

/**
 * Cartel de contacto: unico lugar donde puede estar un dueno con el plan sin
 * abonar. No tiene menu, ni boton de volver, ni acceso a ninguna otra pantalla:
 * el guard de `/plan-pendiente` es el unico camino de entrada a este rol hasta
 * que el superadmin aprueba la solicitud.
 */
export default function PlanPendiente() {
  const sesion = useSesion()

  if (sesion.usuario === null) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <span className="h-10 w-10 animate-radar-pulse rounded-full bg-pitch" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-canvas px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pitch-faint text-pitch">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            {nombreCompleto(sesion.usuario)}, tu cuenta de dueño quedo registrada
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Falta un solo paso para usar el panel de canchas: activar el plan.
          </p>
        </div>

        <section className="surface">
          <h2 className="text-base font-semibold text-ink">Escribinos y lo activamos</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Coordinamos el pago por WhatsApp y apenas se acredite tu superadmin activa tu plan.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas-raised px-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Contacto
              </p>
              <p className="truncate font-mono text-sm font-semibold text-ink">
                {CONTACTO_PLAN_DUENO.visible}
              </p>
            </div>
            <a
              href={LINK_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="btn-primary shrink-0 py-2"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </section>

        <section className="surface">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
            <p className="text-sm text-ink-muted">
              Mientras este pendiente no podes entrar al panel ni cargar tu complejo. Cuando lo
              actives, la proxima vez que entres vas directo a tu panel.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
