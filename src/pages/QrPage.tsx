import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useQrPage } from '../hooks/useQrPage';

export function QrPage() {
  const {
    props: {
      loading,
      host,
      guestFullName,
      firstMessage,
      startFlow,
      error,
      starting,
    },
    methods: {
      setGuestFullName,
      setFirstMessage,
    }
  } = useQrPage()
  const visitorUnavailable = Boolean(host && host.effectiveVisitorStatus && host.effectiveVisitorStatus !== 'available');
  const visitorStatusLabel = host?.effectiveVisitorStatus === 'off_hours' ? 'Fuera de horario' : 'No disponible';

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] flex-col justify-center">
        <div className="rounded-[32px] border border-zinc-200 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(17,17,17,0.08)] sm:px-6 sm:py-7">
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-fit items-center justify-center gap-3">
              <img
                src="/splash/logotipo-color.png"
                alt="Albiero Seguridad"
                className="h-32 w-32 select-none object-contain sm:h-36 sm:w-36"
                draggable={false}
              />
            </div>

            <div className="text-center">
              <h1 className="text-[26px] font-semibold tracking-[0.22em] text-black sm:text-[28px]">
                TIMBRE QR
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-zinc-700 sm:text-[15px]">
                Dejanos tu nombre y tu mensaje
              </p>
              {host?.visitorWelcomeMessage ? <p className="mt-1 text-center text-[13px] leading-5 text-zinc-500">{host.visitorWelcomeMessage}</p> : null}
            </div>

            <div className="w-full rounded-2xl border border-zinc-200 bg-[#fafafa] px-4 py-3 text-center text-sm text-zinc-700">
              {loading
                ? 'Buscando anfitrion...'
                : host?.name
                  ? `Estás contactando a ${host.visitorDisplayName || host.name}${host.effectiveVisitorStatus === 'off_hours' ? ' · Fuera de horario' : host.effectiveVisitorStatus === 'unavailable' ? ' · No disponible' : ''}`
                  : 'No encontramos ese QR'}
            </div>

            {visitorUnavailable ? <div className="w-full rounded-2xl border border-[#f0caca] bg-[#fff3f3] px-4 py-3 text-center text-sm font-medium text-[#9b3438]">{visitorStatusLabel}. No se pueden iniciar conversaciones en este momento.</div> : null}

            <div className="w-full space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
                <span>Tu nombre</span>
                <Input
                  value={guestFullName}
                  onChange={(event) => setGuestFullName(event.target.value)}
                  placeholder="Escribi tu nombre"
                  autoComplete="name"
                  className="h-12 rounded-2xl border-zinc-200 bg-white px-4 text-[15px] shadow-sm placeholder:text-zinc-400 focus:border-[#d32f2f] focus:ring-4 focus:ring-[#d32f2f]/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
                <span>Mensaje</span>
                <Textarea
                  value={firstMessage}
                  onChange={(event) => setFirstMessage(event.target.value)}
                  placeholder="Escribi tu mensaje"
                  rows={5}
                  className="min-h-[140px] rounded-2xl border-zinc-200 bg-white px-4 py-3 text-[15px] shadow-sm placeholder:text-zinc-400 focus:border-[#d32f2f] focus:ring-4 focus:ring-[#d32f2f]/10"
                />
              </label>

              <Button
                type="button"
                onClick={startFlow}
                disabled={loading || starting || visitorUnavailable}
                className="h-14 w-full rounded-2xl bg-[#d32f2f] text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(211,47,47,0.28)] transition hover:bg-[#bf2828] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading || starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {visitorUnavailable ? 'NO DISPONIBLE' : 'ENVIAR'}
              </Button>
            </div>

            {error ? (
              <div className="w-full rounded-2xl border border-[#f4c4c4] bg-[#fdecec] px-4 py-3 text-sm text-[#b3261e]">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
