import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeUser } from '../lib/pushNotifications'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
                // Subscribe to push notifications on initial load if logged in
                try {
                    await subscribeUser()
                } catch (error) {
                    console.error('Error subscribing to push notifications:', error)
                }
            } else setLoading(false)
        })

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
                // Subscribe to push notifications on login
                try {
                    await subscribeUser()
                } catch (error) {
                    console.error('Error subscribing to push notifications:', error)
                }
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
            } else {
                setProfile(data)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setProfile(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
