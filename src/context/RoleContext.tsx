'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Org, OrgRole } from '@/../types/database';
import { useRouter, usePathname } from 'next/navigation';

interface RoleContextType {
  currentOrg: Org;
  currentRole: OrgRole;
  orgs: Org[];
  setOrgById: (id: number) => void;
  isLoading: boolean;
}

const DEFAULT_ORGS: Org[] = [
  { id: 1, name: 'Apollo Pharmacy - Ajmer', role: 'retailer', location: 'Kaiser Ganj, Ajmer, Rajasthan' },
  { id: 2, name: 'City Medicos', role: 'retailer', location: 'Shop 14, Main Market, Malviya Nagar, Jaipur, Rajasthan' },
  { id: 3, name: 'Sunrise Pharmacy', role: 'retailer', location: 'G-22 Commercial Complex, Sector 18, Noida, Uttar Pradesh' },
  { id: 4, name: 'MedLine Distributors', role: 'distributor', location: 'Bhiwandi Central Logistics Hub, Maharashtra' },
  { id: 5, name: 'Cipla Ltd', role: 'manufacturer', location: 'Verna Industrial Estate, Salcete, Goa' },
  { id: 6, name: 'State Drug Controller', role: 'regulator', location: 'FDA Bhavan, Kotla Road, New Delhi' },
];

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<Org[]>(DEFAULT_ORGS);
  const [currentOrg, setCurrentOrg] = useState<Org>(DEFAULT_ORGS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/orgs');
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setOrgs(json.data);
          // Check saved preference in localStorage
          const savedId = localStorage.getItem('medtrace_org_id');
          if (savedId) {
            const found = json.data.find((o: Org) => o.id === Number(savedId));
            if (found) {
              setCurrentOrg(found);
              setIsLoading(false);
              return;
            }
          }
          setCurrentOrg(json.data[0]);
        }
      } catch (err) {
        console.warn('Using default fallback orgs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrgs();
  }, []);

  // Route guard: Redirect unauthorized role portal visits to /login
  useEffect(() => {
    if (isLoading) return;
    const roleRouteMap: Record<string, OrgRole> = {
      '/retailer': 'retailer',
      '/retailer/dispense': 'retailer',
      '/distributor': 'distributor',
      '/manufacturer': 'manufacturer',
      '/regulator': 'regulator',
    };
    const requiredRole = roleRouteMap[pathname];
    if (requiredRole && currentOrg.role !== requiredRole) {
      router.push('/login');
    }
  }, [pathname, currentOrg, isLoading, router]);

  const setOrgById = (id: number) => {
    const found = orgs.find((o) => o.id === id);
    if (!found) return;

    setCurrentOrg(found);
    localStorage.setItem('medtrace_org_id', String(found.id));

    // Route dynamically based on role if on one of the role pages
    const rolePaths: Record<OrgRole, string> = {
      retailer: '/retailer',
      distributor: '/distributor',
      manufacturer: '/manufacturer',
      regulator: '/regulator',
    };

    const targetPath = rolePaths[found.role];
    if (pathname !== targetPath && !pathname.startsWith('/batch/')) {
      router.push(targetPath);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentOrg,
        currentRole: currentOrg.role,
        orgs,
        setOrgById,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
