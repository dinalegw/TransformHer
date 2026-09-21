export function getInitialPurchaseReleaseState(now = new Date()) {
  return {
    released: true,
    releaseAt: now,
  } as const
}
