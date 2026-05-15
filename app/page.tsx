'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1e3a2f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#f5f2ec',
        borderRadius: '6px',
        padding: '2.5rem',
        width: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#1e3a2f',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>ContractIQ</div>
          <div style={{
            fontSize: '11px',
            color: '#5a6e63',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}>Agency Platform</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '9px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: '#5a6e63',
              marginBottom: '5px',
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #c8d4cc',
                borderRadius: '3px',
                background: 'white',
                fontSize: '14px',
                color: '#1a1a18',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '9px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: '#5a6e63',
              marginBottom: '5px',
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #c8d4cc',
                borderRadius: '3px',
                background: 'white',
                fontSize: '14px',
                color: '#1a1a18',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fcc',
              borderRadius: '3px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#c0392b',
              marginBottom: '1rem',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: '#1e3a2f',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}
