import { useEffect, useState } from 'react'

interface DevUser {
  id: string
  email: string
  role: string
  name?: string
  profile?: {
    firstName: string
    lastName: string
  }
}

export function useDevUser() {
  const [devUser, setDevUser] = useState<DevUser | null>(null)

  useEffect(() => {
    // Try to get the dev user from localStorage
    const storedUser = localStorage.getItem('devSelectedUser')
    if (storedUser) {
      try {
        setDevUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored dev user:', error)
      }
    }

    // If no stored user, fetch the first user from the API
    if (!storedUser) {
      fetch('/api/users/first')
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            const user = data.user
            setDevUser(user)
            localStorage.setItem('devSelectedUser', JSON.stringify(user))
          }
        })
        .catch(error => {
          console.error('Failed to fetch first user:', error)
        })
    }

    // Listen for user changes
    const handleUserChange = () => {
      const updatedUser = localStorage.getItem('devSelectedUser')
      if (updatedUser) {
        try {
          setDevUser(JSON.parse(updatedUser))
        } catch (error) {
          console.error('Failed to parse updated dev user:', error)
        }
      }
    }

    window.addEventListener('devUserChanged', handleUserChange)
    return () => window.removeEventListener('devUserChanged', handleUserChange)
  }, [])

  // Helper function to get user's display name
  const getUserDisplayName = () => {
    if (!devUser) return ''
    if (devUser.profile?.firstName) {
      return `${devUser.profile.firstName}'s`
    }
    if (devUser.name) {
      return `${devUser.name}'s`
    }
    return devUser.email.split('@')[0] + "'s"
  }

  return { devUser, getUserDisplayName }
} 