import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CtaBand from "../components/CtaBand";
import NotFound from "../pages/NotFound";
import { TenantProvider, useTenant } from "../context/TenantContext";

function TenantSkeleton() {
  return (
    <div className="min-h-screen bg-cream" role="status">
      <span className="sr-only">Loading…</span>
      <div className="h-20 border-b border-dark/10" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-hidden="true">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-20 items-center">
          <div>
            <div className="h-16 md:h-24 w-3/4 bg-dark/10 rounded-sm animate-pulse" />
            <div className="h-6 w-1/2 bg-dark/10 rounded-sm animate-pulse mt-6" />
            <div className="flex gap-4 mt-10">
              <div className="h-12 w-40 bg-dark/10 rounded-sm animate-pulse" />
              <div className="h-12 w-40 bg-dark/10 rounded-sm animate-pulse" />
            </div>
          </div>
          <div className="h-80 bg-dark/10 rounded-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function TenantLayoutInner() {
  const { tenant, loading, error } = useTenant();

  useEffect(() => {
    if (tenant) {
      document.title = tenant.tagline
        ? `${tenant.name} | ${tenant.tagline}`
        : tenant.name;
    }
    return () => {
      document.title = "TableSuite | Restaurant websites";
    };
  }, [tenant]);

  if (loading) {
    return <TenantSkeleton />;
  }

  if (error || !tenant) {
    return <NotFound backTo="/" backLabel="Back to start" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <CtaBand slug={tenant.slug} />
      <Footer />
    </div>
  );
}

export default function TenantLayout() {
  return (
    <TenantProvider>
      <TenantLayoutInner />
    </TenantProvider>
  );
}
