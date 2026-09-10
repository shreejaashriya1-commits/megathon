'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';

export default function HomePage() {
  const { currentRole, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const roleRoutes: Record<string, string> = {
      retailer: '/retailer',
      distributor: '/distributor',
      manufacturer: '/manufacturer',
      regulator: '/regulator',
    };
    const target = roleRoutes[currentRole] || '/retailer';
    router.replace(target);
  }, [currentRole, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#1769E0] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          Redirecting to Operational Workspace...
        </p>
      </div>
    </div>
  );
}
