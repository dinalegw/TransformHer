export function shouldExcludeSeedBooks(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'production'
}
