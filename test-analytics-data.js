const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkData() {
  console.log('\n=== Checking events_subscriptions ===')
  const { data: events, error: eventsError } = await supabase
    .from('events_subscriptions')
    .select('event_type, customer_id, subscription_id, amount_recurring_cents, occurred_at_utc')
    .order('occurred_at_utc', { ascending: false })
    .limit(5)

  if (eventsError) {
    console.error('Error:', eventsError)
  } else {
    console.log(`Found ${events.length} events:`)
    events.forEach(e => {
      console.log(`- ${e.event_type}: $${e.amount_recurring_cents / 100} (${e.subscription_id})`)
    })
  }

  console.log('\n=== Checking webhook_events ===')
  const { data: webhooks, error: webhooksError } = await supabase
    .from('webhook_events')
    .select('event_type, processed, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (webhooksError) {
    console.error('Error:', webhooksError)
  } else {
    console.log(`Found ${webhooks.length} webhook events:`)
    webhooks.forEach(w => {
      console.log(`- ${w.event_type}: processed=${w.processed}`)
    })
  }

  console.log('\n=== Checking facts_daily ===')
  const { data: facts, error: factsError } = await supabase
    .from('facts_daily')
    .select('day, mrr_cents_normalized, active_subscribers, new_customers')
    .order('day', { ascending: false })
    .limit(5)

  if (factsError) {
    console.error('Error:', factsError)
  } else {
    console.log(`Found ${facts.length} daily facts:`)
    facts.forEach(f => {
      console.log(`- ${f.day}: MRR=$${f.mrr_cents_normalized / 100}, Subs=${f.active_subscribers}, New=${f.new_customers}`)
    })
  }
}

checkData().then(() => process.exit(0))
