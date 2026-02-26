import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { purchaseUpgrade, UpgradeType, UPGRADE_CONFIG } from '@/app/actions/upgrades';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { aircraftId, upgradeType } = body;

    if (!aircraftId || !upgradeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!UPGRADE_CONFIG[upgradeType as UpgradeType]) {
        return NextResponse.json({ error: 'Invalid upgrade type' }, { status: 400 });
    }

    // Call the shared logic
    const result = await purchaseUpgrade(aircraftId, upgradeType as UpgradeType);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      newBalance: result.newBalance
    });

  } catch (error) {
    console.error('Upgrade purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
