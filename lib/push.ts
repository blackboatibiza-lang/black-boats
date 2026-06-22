import webpush from 'web-push'

function getClient() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails('mailto:comunicacionatipico@gmail.com', pub, priv)
  return webpush
}

export async function sendPush(subscription: any, payload: {
  title: string; body: string; tag?: string; url?: string
}) {
  const client = getClient()
  try {
    await client.sendNotification(subscription, JSON.stringify(payload))
  } catch (e: any) {
    if (e.statusCode === 410 || e.statusCode === 404) throw new Error('SUBSCRIPTION_EXPIRED')
    console.error('Push error:', e.message)
  }
}
