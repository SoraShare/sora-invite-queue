import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, Gift, Home } from 'lucide-react';

interface MobileBottomNavProps {
  isVisible: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ isVisible }) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  if (!isVisible) return null;

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Home'
    },
    {
      path: '/request',
      icon: Download,
      label: 'Request Code'
    },
    {
      path: '/donate',
      icon: Gift,
      label: 'Donate Code'
    }
  ];

  return (
    <div className="md:hidden">
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16"></div>
      
      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-2 min-w-0 flex-1 transition-colors ${
                  active
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? 'text-primary-600' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium truncate ${
                  active ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};