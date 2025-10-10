import { ReactNode } from 'react';
import { AppFooter } from './AppFooter';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-x-hidden max-w-full">
      {children}
      <AppFooter />
    </div>
  );
};