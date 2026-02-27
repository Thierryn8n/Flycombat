import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { purchaseUpgrade } from '@/app/actions/upgrades';
import { UPGRADE_CONFIG, type UpgradeType } from '@/lib/upgrades';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { aircraftId, upgrades } = body; 
    // upgrades: { speed: 2, weapons: 1 } target levels

    if (!aircraftId || !upgrades) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = [];
    
    // Get current state to know where to start
    const { data: playerAircraft } = await supabase
        .from("player_aircraft")
        .select("custom_full_json")
        .eq("aircraft_id", aircraftId)
        .eq("player_id", user.id)
        .single();
        
    const currentUpgrades = playerAircraft?.custom_full_json?.upgrades || { speed: 0, weapons: 0, resistance: 0, autoaim: 0 };

    for (const [type, targetLevel] of Object.entries(upgrades)) {
        if (!UPGRADE_CONFIG[type as UpgradeType]) continue;
        
        let currentLevel = currentUpgrades[type as UpgradeType] || 0;
        const target = targetLevel as number;
        
        while (currentLevel < target) {
            // Attempt to purchase next level
            const result = await purchaseUpgrade(aircraftId, type as UpgradeType);
            results.push({ type, level: currentLevel + 1, success: result.success, error: result.error });
            
            if (!result.success) break; // Stop if failed (e.g. no money)
            currentLevel++;
        }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Upgrade sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
