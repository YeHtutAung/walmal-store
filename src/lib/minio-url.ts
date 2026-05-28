const MINIO_PREFIXES = ['http://minio:9000', 'http://localhost:9000']

export function resolveMinioUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  for (const prefix of MINIO_PREFIXES) {
    if (url.startsWith(prefix)) {
      return '/api/minio' + url.slice(prefix.length)
    }
  }
  return url
}
