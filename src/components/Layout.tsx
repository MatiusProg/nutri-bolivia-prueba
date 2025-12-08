import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Leaf, User, LogOut, Search, ChefHat, Users, Menu, Bookmark, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import AuthModal from '@/components/AuthModal';
import { CentroNotificaciones } from '@/components/notificaciones/CentroNotificaciones';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { isStaff } = useUserRole();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="bg-gradient-fresh p-2 rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-fresh bg-clip-text text-transparent">
                NutriBolivia
              </span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/alimentos"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                Alimentos
              </Link>
              
              {user && (
                <>
                  <Link
                    to="/mis-recetas"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChefHat className="h-4 w-4" />
                    Mis Recetas
                  </Link>
                  <Link
                    to="/recetas-guardadas"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Bookmark className="h-4 w-4" />
                    Guardadas
                  </Link>
                </>
              )}
              
              <Link
                to="/comunidad"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Users className="h-4 w-4" />
                Comunidad
              </Link>
            </div>

            {/* Acciones de usuario */}
            <div className="flex items-center gap-2">
              {/* Notificaciones - visible en móvil Y desktop */}
              {user && <CentroNotificaciones />}
              
              {/* Menú hamburguesa - solo móvil */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-primary" />
                      NutriBolivia
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-8">
                    <Link
                      to="/alimentos"
                      className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="h-5 w-5" />
                      Alimentos
                    </Link>
                    
                    {user && (
                      <>
                        <Link
                          to="/mis-recetas"
                          className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <ChefHat className="h-5 w-5" />
                          Mis Recetas
                        </Link>
                        <Link
                          to="/recetas-guardadas"
                          className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Bookmark className="h-5 w-5" />
                          Guardadas
                        </Link>
                      </>
                    )}
                    
                    <Link
                      to="/comunidad"
                      className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Users className="h-5 w-5" />
                      Comunidad
                    </Link>

                    {user && (
                      <>
                        <div className="border-t border-border my-2" />
                        <Link
                          to="/perfil"
                          className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="h-5 w-5" />
                          Mi Perfil
                        </Link>
                        {isStaff && (
                          <Link
                            to="/admin/reportes"
                            className="flex items-center gap-3 text-base hover:text-primary transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Shield className="h-5 w-5" />
                            Panel Admin
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 text-base hover:text-primary transition-colors text-left"
                        >
                          <LogOut className="h-5 w-5" />
                          Cerrar Sesión
                        </button>
                      </>
                    )}

                    {!user && (
                      <>
                        <div className="border-t border-border my-2" />
                        <Button 
                          onClick={() => {
                            setShowAuthModal(true);
                            setMobileMenuOpen(false);
                          }} 
                          className="w-full"
                        >
                          Iniciar Sesión
                        </Button>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-sm font-medium">
                        {user.email}
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to="/mis-recetas" className="cursor-pointer">
                          <ChefHat className="mr-2 h-4 w-4" />
                          Mis Recetas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/perfil" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Mi Perfil
                        </Link>
                      </DropdownMenuItem>
                      {isStaff && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reportes" className="cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />
                            Panel Admin
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button onClick={() => setShowAuthModal(true)} variant="default">
                    Iniciar Sesión
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-semibold">NutriBolivia</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 NutriBolivia. Base de datos nutricional de alimentos bolivianos.
            </p>
          </div>
        </div>
      </footer>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
