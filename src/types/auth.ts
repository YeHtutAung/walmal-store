export interface CustomerUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: CustomerUser
}
