import React from 'react';
import  TopNavBar  from '@/components/layout/TopNavBar';

const PatientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <TopNavBar />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
      <footer className="bg-surface dark:bg-surface-dim border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-8 py-4">
        <div className="mb-4 md:mb-0">
          <span className="font-bold text-on-surface">CareHive</span>
          <p className="text-on-surface-variant text-xs mt-1">© 2024 CareHive. All rights reserved.</p>
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-xs">
            Privacy Policy
          </a>
          <a href="#" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-xs">
            Terms of Service
          </a>
          <a href="#" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-xs">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;