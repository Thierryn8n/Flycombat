"use server"

import { createClient } from "@/lib/supabase/server"

export async function convertPointsToFlygold(pointsToUse: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "Faça login para conversão persistente." }
  }
  const rate = 10000
  const { data: profile } = await supabase
    .from("profiles")
    .select("flygold_balance, total_points")
    .eq("id", user.id)
    .single()
  if (!profile) return { success: false, message: "Perfil não encontrado." }
  const use = Math.min(profile.total_points || 0, Math.max(0, Math.floor(pointsToUse || 0)))
  const fg = Math.floor(use / rate)
  if (fg <= 0) return { success: false, message: "Pontos insuficientes para conversão." }
  const pointsSpent = fg * rate
  const newBalance = (profile.flygold_balance || 0) + fg
  const newPoints = (profile.total_points || 0) - pointsSpent
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ flygold_balance: newBalance, total_points: newPoints })
    .eq("id", user.id)
  if (upErr) return { success: false, message: "Falha ao atualizar saldo." }
  await supabase.from("flygold_transactions").insert({
    player_id: user.id,
    amount: fg,
    type: "earned",
    description: `Conversão de ${pointsSpent} pontos em ${fg} FG`,
  })
  return { success: true, message: `Conversão aplicada: +${fg} FG` }
}
