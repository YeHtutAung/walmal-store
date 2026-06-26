export interface CustomerUser {
  id: string
  username: string
}

// What the browser receives from our proxy routes (no refreshToken)
export interface ClientAuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

// Full Spring Boot response — only used server-side inside proxy routes
export interface AuthResponse extends ClientAuthResponse {
  refreshToken: string
  role: string
}
