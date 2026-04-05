import { createContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const fetchUser = async () => {
      try {
        console.log('Fetching user from API...')
        const res = await fetch(`${API_URL}/api/user`, {
          credentials: 'include',
        })
        
        if (res.ok) {
          const userData = await res.json()
          console.log('✅ User fetched successfully:', userData)
          setUser(userData)
          setLoading(false)
          return true
        } else {
          throw new Error(`API returned ${res.status}`)
        }
      } catch (err) {
        console.error('Fetch user error (attempt ' + (retryCount + 1) + '):', err)
        retryCount++
        
        // Retry with delay if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`Retrying in 500ms... (${retryCount}/${maxRetries})`)
          setTimeout(fetchUser, 500)
        } else {
          // Max retries exceeded
          console.log('Max retries exceeded, user not authenticated')
          setUser(null)
          setLoading(false)
        }
        return false
      }
    }

    // Add a small initial delay to let cookies settle after OAuth redirect
    setTimeout(fetchUser, 100)
  }, [])

  const logout = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logout`, {
        credentials: 'include',
        method: 'GET',
      })
      if (res.ok) {
        setUser(null)
        window.location.href = '/' // Force a full page reload
      } else {
        throw new Error('Logout failed')
      }
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const liveblocksAuth = async (room) => {
    try {
      const res = await fetch(`${API_URL}/api/liveblocks-auth`, {
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({ room }),
      })
      if (res.ok) {
        return res.json()
      } else {
        throw new Error('Lblocks auth failed')
      }
    } catch (err) {
      console.error('Liveblocks auth failed:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, liveblocksAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider, AuthContext }
