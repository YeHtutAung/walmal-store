export interface CustomerUser {
  id: string
  username: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  role: string
}
