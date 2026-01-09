import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createOrUpdateProfile(session.user);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Actualizar perfil para usuarios existentes que ya tienen sesión
      if (session?.user) {
        createOrUpdateProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createOrUpdateProfile = async (user: User) => {
    try {
      // Extraer datos del usuario de Google/Facebook
      const fullName = user.user_metadata?.full_name 
        || user.user_metadata?.name 
        || user.email?.split('@')[0] 
        || 'Usuario';
      
      const avatarUrl = user.user_metadata?.avatar_url 
        || user.user_metadata?.picture 
        || '';

      // Upsert en la tabla perfiles
      const { error } = await supabase
        .from('perfiles')
        .upsert({
          id: user.id,
          nombre_completo: fullName,
          avatar_url: avatarUrl,
          email: user.email || '',
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error creando/actualizando perfil:', error);
      }
    } catch (error) {
      console.error('Error with profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: 'Error de autenticación',
        description: authError.message,
        variant: 'destructive',
      });
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: 'Error de autenticación',
        description: authError.message,
        variant: 'destructive',
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión exitosamente',
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: 'Error',
        description: authError.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGoogle,
      signInWithFacebook,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
