import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { data, error } = await supabase
      .from('listings')
      .select('id, title, slug, listing_media(id)')
      .eq('slug', 'establishment-ballroom-sydney')
      .single();

    return NextResponse.json({
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl,
      },
      query: {
        data: data,
        error: error,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
