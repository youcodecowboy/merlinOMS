import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  role: string
  name: string
}

export function UserSwitcher() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  useEffect(() => {
    fetchUsers()
    // Load selected user from localStorage
    const savedUserId = localStorage.getItem('devSelectedUserId')
    if (savedUserId) {
      setSelectedUserId(savedUserId)
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/test/users/list')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
        // If no user is selected and we have users, select the first one
        if (!selectedUserId && data.users.length > 0) {
          handleUserChange(data.users[0].id)
        }
      } else {
        console.error('API error:', data.error)
        toast.error('Failed to load test users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error loading test users')
    }
  }

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
    const selectedUser = users.find(u => u.id === userId)
    if (selectedUser) {
      localStorage.setItem('devSelectedUser', JSON.stringify(selectedUser))
      // Also store ID separately for backward compatibility
      localStorage.setItem('devSelectedUserId', userId)
      // Notify parent components about user change
      window.dispatchEvent(new CustomEvent('devUserChanged', { 
        detail: { userId } 
      }))
      // Show toast
      toast.success(`Switched to ${selectedUser.name} (${selectedUser.role})`)
    }
  }

  if (users.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">Test As:</span>
      <Select value={selectedUserId} onValueChange={handleUserChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select user..." />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center justify-between w-full">
                <span>{user.name}</span>
                <Badge variant="outline" className="ml-2">
                  {user.role}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 