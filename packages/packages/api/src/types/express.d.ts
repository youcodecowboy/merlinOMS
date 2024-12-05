import { User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: User
      requestId?: string
      startTime?: number
    }
  }
}

// Need to export something for TypeScript to recognize this as a module
export {} 