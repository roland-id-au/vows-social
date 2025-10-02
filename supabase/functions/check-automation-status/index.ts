// Check automation status - verifies all backend processes are running
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check recent pipeline runs
    const { data: pipelineRuns } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('source', 'morning_discovery_pipeline')
      .order('timestamp', { ascending: false })
      .limit(7) // Last week

    // Check discovery runs
    const { data: discoveryRuns } = await supabase
      .from('sync_logs')
      .select('*')
      .in('source', ['instagram_discovery', 'wedding_services_discovery'])
      .order('timestamp', { ascending: false })
      .limit(14)

    // Check refresh runs
    const { data: refreshRuns } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('source', 'scheduled_refresh')
      .order('timestamp', { ascending: false })
      .limit(4) // Last month

    // Check research activity
    const { data: researchRuns } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('source', 'perplexity_deep_research')
      .order('timestamp', { ascending: false })
      .limit(20)

    // Get discovery stats by service type
    const { data: discoveryStats } = await supabase
      .rpc('discovery_stats')
      .select('*')

    // Calculate automation health
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const recentPipeline = pipelineRuns?.filter(r =>
      new Date(r.timestamp) > oneDayAgo
    ).length || 0

    const recentDiscovery = discoveryRuns?.filter(r =>
      new Date(r.timestamp) > oneDayAgo
    ).length || 0

    const recentResearch = researchRuns?.filter(r =>
      new Date(r.timestamp) > oneDayAgo
    ).length || 0

    const weeklyPipeline = pipelineRuns?.filter(r =>
      new Date(r.timestamp) > oneWeekAgo
    ).length || 0

    // Check for service type diversity in discoveries
    const { data: serviceTypeDiscoveries } = await supabase
      .from('discovered_listings')
      .select('type')

    const serviceTypeCounts = serviceTypeDiscoveries?.reduce((acc: any, d: any) => {
      acc[d.type] = (acc[d.type] || 0) + 1
      return acc
    }, {})

    // Check for service type diversity in listings
    const { data: listings } = await supabase
      .from('listings')
      .select('category')

    const listingTypeCounts = listings?.reduce((acc: any, l: any) => {
      acc[l.category] = (acc[l.category] || 0) + 1
      return acc
    }, {})

    // Determine automation health status
    let status = 'healthy'
    const issues: string[] = []

    if (recentPipeline === 0) {
      status = 'warning'
      issues.push('No morning pipeline run in last 24 hours')
    }

    if (recentDiscovery === 0) {
      status = 'warning'
      issues.push('No discovery activity in last 24 hours')
    }

    if (weeklyPipeline < 5) {
      status = 'degraded'
      issues.push(`Only ${weeklyPipeline} pipeline runs this week (expected ~7)`)
    }

    if (!serviceTypeCounts || Object.keys(serviceTypeCounts).length < 2) {
      status = 'warning'
      issues.push('Discoveries limited to venues only (no service diversity)')
    }

    if (!listingTypeCounts || Object.keys(listingTypeCounts).length < 2) {
      issues.push('Listings limited to venues only (no service diversity yet)')
    }

    if (recentResearch === 0) {
      status = 'warning'
      issues.push('No research activity in last 24 hours')
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        automation: {
          last_pipeline_run: pipelineRuns?.[0]?.timestamp || null,
          last_discovery_run: discoveryRuns?.[0]?.timestamp || null,
          last_refresh_run: refreshRuns?.[0]?.timestamp || null,
          last_research: researchRuns?.[0]?.timestamp || null,
          pipeline_runs_24h: recentPipeline,
          discovery_runs_24h: recentDiscovery,
          research_runs_24h: recentResearch,
          pipeline_runs_7d: weeklyPipeline
        },
        diversity: {
          discovery_service_types: serviceTypeCounts || {},
          listing_service_types: listingTypeCounts || {},
          total_service_types_discovered: Object.keys(serviceTypeCounts || {}).length,
          total_service_types_listed: Object.keys(listingTypeCounts || {}).length
        },
        issues,
        recommendations: issues.length > 0 ? [
          'Run morning-discovery-pipeline to kickstart automation',
          'Verify cron jobs are configured in database',
          'Check Perplexity API rate limits',
          'Review sync_logs for error patterns'
        ] : [
          'Automation is running smoothly',
          'Monitor daily for consistent growth',
          'Review enrichment quality weekly'
        ]
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
