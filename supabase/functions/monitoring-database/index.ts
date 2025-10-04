// Quick function to check database stats
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get total listings count
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })

    // Get listings by category
    const { data: byCategory } = await supabase
      .from('listings')
      .select('category')

    const categoryCounts = byCategory?.reduce((acc: any, row: any) => {
      acc[row.category] = (acc[row.category] || 0) + 1
      return acc
    }, {})

    // Get discovery stats
    const { count: totalDiscoveries } = await supabase
      .from('discovered_listings')
      .select('*', { count: 'exact', head: true })

    const { count: pending } = await supabase
      .from('discovered_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_research')

    const { count: researched } = await supabase
      .from('discovered_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'researched')

    const { count: failed } = await supabase
      .from('discovered_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'research_failed')

    // Get enrichment quality
    const { data: listings } = await supabase
      .from('listings')
      .select('id')

    let withPhotos = 0
    let withPackages = 0
    let fullyEnriched = 0

    if (listings) {
      for (const listing of listings) {
        const { count: photoCount } = await supabase
          .from('listing_media')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', listing.id)

        const { count: packageCount } = await supabase
          .from('packages')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', listing.id)

        if (photoCount && photoCount > 0) withPhotos++
        if (packageCount && packageCount > 0) withPackages++
        if (photoCount && photoCount > 0 && packageCount && packageCount > 0) fullyEnriched++
      }
    }

    // Get recent sync logs
    const { data: recentLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5)

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalListings,
          categoryCounts,
          totalDiscoveries,
          pending,
          researched,
          failed,
          enrichment: {
            withPhotos,
            withPackages,
            fullyEnriched,
            enrichmentRate: totalListings ? Math.round((fullyEnriched / totalListings) * 100) + '%' : '0%'
          }
        },
        recentLogs
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
