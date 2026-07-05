import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/layout/TopNavBar';

const PatientLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <TopNavBar />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
        <Outlet />
      </main>
      <footer className="bg-surface dark:bg-surface-dim border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-margin-desktop py-lg mt-auto">
        <div className="mb-md md:mb-0">
          <span className="font-label-lg text-label-lg font-bold text-on-surface">CareHive</span>
          <p className="font-label-md text-label-md text-secondary dark:text-secondary-fixed-dim mt-xs">© 2024 CareHive. All rights reserved.</p>
        </div>
        <div className="flex gap-xl">
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Privacy Policy
          </a>
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Terms of Service
          </a>
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;