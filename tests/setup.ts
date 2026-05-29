import '@testing-library/jest-dom'

// MSW + axios need an absolute base URL; set before any module is imported
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api/v1'
