import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aircraftId = searchParams.get('aircraftId');
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!aircraftId) {
        return NextResponse.json({ error: 'Aircraft ID required' }, { status: 400 });
    }

    // Get Player Aircraft
    const { data: playerAircraft, error } = await supabase
        .from("player_aircraft")
        .select("custom_full_json")
        .eq("aircraft_id", aircraftId)
        .eq("player_id", user.id)
        .single();

    if (error || !playerAircraft) {
        return NextResponse.json({ error: 'Aircraft not found or not owned' }, { status: 404 });
    }

    const upgrades = playerAircraft.custom_full_json?.upgrades || { speed: 0, weapons: 0, resistance: 0, autoaim: 0 };
    const specs = playerAircraft.custom_full_json?.specs || {};

    return NextResponse.json({
        success: true,
        upgrades,
        specs
    });

  } catch (error) {
    console.error('Upgrade query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
