import { type NextRequest, NextResponse } from 'next/server'
import http from 'node:http'

export async function GET(req: NextRequest) {
  // Use req.nextUrl.pathname to preserve percent-encoding — params.path decodes it,
  // which produces invalid paths for filenames with spaces/special characters.
  const pathname = req.nextUrl.pathname.replace(/^\/api\/minio/, '') + req.nextUrl.search

  return new Promise<NextResponse>((resolve) => {
    const proxyReq = http.request(
      { hostname: 'localhost', port: 9000, path: pathname, method: 'GET', headers: { host: 'minio:9000' } },
      (proxyRes) => {
        const chunks: Buffer[] = []
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
        proxyRes.on('end', () => {
          resolve(
            new NextResponse(Buffer.concat(chunks), {
              status: proxyRes.statusCode ?? 200,
              headers: {
                'content-type': proxyRes.headers['content-type'] ?? 'application/octet-stream',
                'cache-control': 'public, max-age=3600',
              },
            }),
          )
        })
      },
    )
    proxyReq.on('error', () =>
      resolve(NextResponse.json({ error: 'minio upstream error' }, { status: 502 })),
    )
    proxyReq.end()
  })
}
