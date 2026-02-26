"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { clearGuestData } from "@/lib/guest-storage"

export default function SyncUpgrades() {
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        const sync = async () => {
            const pendingStr = localStorage.getItem("guest_upgrades_pending")
            if (!pendingStr) return

            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                const pending = JSON.parse(pendingStr)
                let syncedCount = 0
                let hasErrors = false

                // Show syncing toast
                toast({
                    title: "Sincronizando...",
                    description: "Aplicando melhorias feitas como visitante à sua conta.",
                })

                for (const [aircraftId, upgrades] of Object.entries(pending)) {
                    try {
                        const res = await fetch("/api/upgrades/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ aircraftId, upgrades })
                        })
                        
                        if (res.ok) {
                            syncedCount++
                        } else {
                            hasErrors = true
                        }
                    } catch (e) {
                        console.error("Sync failed for", aircraftId, e)
                        hasErrors = true
                    }
                }

                if (syncedCount > 0) {
                    localStorage.removeItem("guest_upgrades_pending")
                    toast({
                        title: "Sincronização Concluída",
                        description: `${syncedCount} aeronaves atualizadas com sucesso!`,
                        variant: "default"
                    })
                    // Refresh to show new stats
                    router.refresh()
                } else if (hasErrors) {
                     toast({
                        title: "Erro na Sincronização",
                        description: "Algumas melhorias não puderam ser aplicadas (possivelmente saldo insuficiente).",
                        variant: "destructive"
                    })
                    // Clear anyway to avoid loop? Or keep? 
                    // Better to clear or it will annoy user every time.
                    localStorage.removeItem("guest_upgrades_pending")
                }
            }
        }
        
        sync()

        const supabase = createClient()
        supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                clearGuestData()
                toast({
                    title: "Sessão Encerrada",
                    description: "Dados temporários foram limpos do dispositivo.",
                })
                router.refresh()
            }
        })
    }, [toast, router])

    return null
}
