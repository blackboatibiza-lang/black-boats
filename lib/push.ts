import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:comunicacionatipico@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPush(subscription: any, payload: {
  title: string
  body: string
  tag?: string
  url?: string
}) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (e: any) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired — caller should delete it
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
    console.error('Push error:', e.message)
  }
}
