import { ArrowLeft, Clock3, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useChatPage } from "../hooks/useChatPage";

export function ChatPage() {
  const {
      props: {
        composer,
        conversationTimeoutAt,
      error,
      expired,
      filteredMessages,
      loading,
      sending,
      timeLeftMs,
      title,
    },
    methods: {
      formatTimeLeft,
      keyForMessage,
      navigate,
      sendMessage,
      setComposer,
    },
  } = useChatPage();

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] flex-col">
        <div className="rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(17,17,17,0.08)]">
          <div className="border-b border-zinc-200 px-5 py-5">
            <div className="flex w-fit items-center justify-center gap-3">
              <img
                src="/splash/logotipo-color.png"
                alt="Albiero Seguridad"
                className="h-10 w-10 select-none object-contain sm:h-12 sm:w-12"
                draggable={false}
              />
              <div className="flex w-[132px] flex-col items-center leading-none text-center sm:w-[148px]">
                <span className="w-full text-[22px] font-extrabold tracking-[0.08em] text-[#d32f2f] sm:text-[24px]">
                  Albiero
                </span>
                <span className="mt-1 w-full text-[15px] font-semibold tracking-[0.14em] text-[#d32f2f] sm:text-[17px]">
                  Seguridad
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-zinc-200 bg-[#fafafa] px-5 py-4">
            <div className="flex items-start gap-3">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-0.5 shrink-0 rounded-full"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[18px] font-semibold leading-6 text-zinc-900">
                    {loading ? "Cargando conversación" : title}
                  </h2>
                  <span className="rounded-full bg-[#d32f2f] px-3 py-1 text-xs font-semibold text-white">
                    Anonimo
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                  <Clock3 className="h-4 w-4" />
                  {!conversationTimeoutAt
                    ? loading
                      ? "Cargando conversación..."
                      : "Sesión activa"
                    : expired
                      ? "La conversación terminó"
                      : `Restan ${formatTimeLeft(timeLeftMs)}`}
                </p>
              </div>

            </div>
          </div>

          <div className="flex min-h-[520px] flex-col">
            <div className="flex-1 px-4 py-4 sm:px-5">
              <div className="flex h-full min-h-[360px] flex-col justify-end gap-3">
                {filteredMessages.map((item) => {
                  const mine = item.sender === "guest";
                  const deliveryMark =
                    item.deliveryStatus === "read"
                      ? "✓✓"
                      : item.deliveryStatus === "delivered"
                        ? "✓"
                        : "";
                  return (
                    <div
                      key={keyForMessage(item)}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-5 shadow-sm ${
                          mine
                            ? "rounded-br-[6px] bg-[#d32f2f] text-white"
                            : "rounded-bl-[6px] bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        <p>{item.message}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <span
                            className={`block text-[10px] ${mine ? "text-white/80" : "text-zinc-500"}`}
                          >
                            {new Date(item.timestamp).toLocaleTimeString(
                              "es-AR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          {mine && deliveryMark ? (
                            <span
                              className={`text-[10px] font-semibold ${
                                item.deliveryStatus === "read"
                                  ? "text-sky-300"
                                  : "text-white/80"
                              }`}
                            >
                              {deliveryMark}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-zinc-200 bg-white p-4">
              <div className="flex gap-3">
                <Textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder={
                    loading
                      ? "Cargando conversación..."
                      : expired
                      ? "La conversación terminó"
                      : "Escribí un mensaje..."
                  }
                  rows={2}
                  className="min-h-[56px] flex-1 rounded-2xl border-zinc-200 bg-white px-4 py-3 text-[15px] shadow-sm placeholder:text-zinc-400 focus:border-[#d32f2f] focus:ring-4 focus:ring-[#d32f2f]/10"
                  disabled={loading || expired}
                />
                <Button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || sending || expired}
                  className="h-14 w-14 shrink-0 rounded-2xl bg-[#d32f2f] text-white shadow-[0_14px_30px_rgba(211,47,47,0.28)] hover:bg-[#bf2828] disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-[#f4c4c4] bg-[#fdecec] px-4 py-3 text-sm text-[#b3261e]">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
