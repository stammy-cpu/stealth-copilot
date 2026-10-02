import { NextResponse, type NextRequest } from 'next/server'

// Auth removed — all routes are publicly accessible.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
