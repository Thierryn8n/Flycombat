"use client"

import { useEffect, useState } from \"react\"
import { startCheckoutSession } from \"@/app/actions/stripe\"
import { FLYGOLD_PACKAGES } from \"@/lib/products\"
import { Button } from \"@/components/ui/button\"
import { Card, CardContent, CardHeader, CardTitle } from \"@/components/ui/card\"
import { Coins } from \"lucide-react\"
import { createClient } from \"@/lib/supabase/client\"
import { getGuestFlygold, getGuestPoints, exchangePointsForFlygold } from \"@/lib/guest-storage\"
import { convertPointsToFlygold } from \"@/app/actions/flygold-convert\"

export default function FlyGoldClient() {
  const [status, setStatus] = useState<string>(\"\")
  const [userId, setUserId] = useState<string | null>(null)
  const [guestFg, setGuestFg] = useState<number>(getGuestFlygold())
  const [guestPoints, setGuestPoints] = useState<number>(getGuestPoints())
  const [convertInput, setConvertInput] = useState<string>(\"10000\")
  const [converting, setConverting] = useState<boolean>(false)
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    if (!hasSupabaseEnv) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [hasSupabaseEnv])

  async function buy(id: string) {
    setStatus(\"Gerando sessão de pagamento...\")
    try {
      const clientSecret = await startCheckoutSession(id)
      setStatus(`Sessão criada. Client Secret: ${clientSecret.slice(0, 12)}...`)
    } catch (e) {
      setStatus(\"Falha ao iniciar checkout\")
    }
  }

  return (
    <div className=\"min-h-screen bg-black text-white px-6 py-8\">
      <div className=\"mx-auto max-w-4xl\">
        <div className=\"flex items-center gap-3 mb-6\">
          <div className=\"w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)]\">
            <Coins className=\"w-4 h-4 text-black\" />
          </div>
          <h1 className=\"text-xl font-bold tracking-tight\">Comprar FlyGold</h1>
        </div>

        <p className=\"text-sm text-slate-300 mb-6\">
          Use FlyGold para liberar aeronaves, skins e melhorias visuais. Integração com Stripe para pagamento seguro.
        </p>

        <div className=\"mb-8 rounded-xl border border-orange-500/40 bg-gradient-to-br from-black via-black to-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.15)]\">
          <div className=\"px-5 py-4 flex items-center justify-between\">
            <div>
              <div className=\"text-sm font-bold uppercase tracking-wider text-orange-400\">Trocar Pontos por FlyGold</div>
              <div className=\"text-xs text-slate-400 mt-1\">
                10.000 pontos = 1 FlyGold. {userId ? \"Persistente (salvo na sua conta)\" : \"Temporário (salvo no dispositivo)\"}.
              </div>
            </div>
            <div className=\"flex items-end gap-6\">
              {!userId && (
                <div className=\"text-right\">
                  <div className=\"text-[10px] uppercase text-slate-400\">Pontos (Visitante)</div>
                  <div className=\"text-lg font-extrabold\">{guestPoints.toLocaleString()}</div>
                </div>
              )}
              <div className=\"text-right\">
                <div className=\"text-[10px] uppercase text-slate-400\">FlyGold</div>
                <div className=\"text-lg font-extrabold text-orange-400\">{guestFg.toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className=\"px-5 pb-5\">
            <div className=\"flex items-center gap-3\">
              <input
                value={convertInput}
                onChange={(e) => setConvertInput(e.target.value)}
                className=\"bg-black border border-slate-700 rounded px-3 py-2 text-sm w-40 text-right text-white focus:outline-none focus:border-orange-500\"
                placeholder=\"10000\"
              />
              <Button
                className=\"bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold\"
                disabled={converting}
                onClick={async () => {
                  setConverting(true)
                  const pointsToUse = Number(convertInput) || 0
                  try {
                    if (!userId) {
                      const res = exchangePointsForFlygold(pointsToUse, 10000)
                      if (!res.success) {
                        setStatus(\"Quantidade insuficiente de pontos.\")
                      } else {
                        setStatus(`Conversão temporária: +${res.flygoldGained} FG`)
                        setGuestFg(getGuestFlygold())
                        setGuestPoints(getGuestPoints())
                      }
                    } else {
                      const result = await convertPointsToFlygold(pointsToUse)
                      setStatus(result.message)
                    }
                  } finally {
                    setConverting(false)
                  }
                }}
              >
                Converter
              </Button>
            </div>
          </div>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
          {FLYGOLD_PACKAGES.map((p) => (
            <Card key={p.id} className=\"border border-orange-500/20 bg-black\">
              <CardHeader>
                <CardTitle className=\"text-base text-white\">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-2 text-sm\">
                <div className=\"text-slate-300\">{p.description}</div>
                <div className=\"flex items-center justify-between\">
                  <span className=\"text-slate-400\">Valor</span>
                  <span className=\"font-mono text-orange-400\">
                    {new Intl.NumberFormat(\"pt-BR\", { style: \"currency\", currency: \"BRL\" }).format(p.priceInCents / 100)}
                  </span>
                </div>
                <Button className=\"w-full bg-orange-600 hover:bg-orange-500\" onClick={() => buy(p.id)}>
                  Comprar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {status && <div className=\"mt-6 text-xs text-orange-300\">{status}</div>}
      </div>
    </div>
  )
}
