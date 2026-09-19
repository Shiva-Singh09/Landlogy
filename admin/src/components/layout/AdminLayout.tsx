import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { NotificationProvider } from '../notifications/NotificationProvider';
import { NotificationBanners } from '../notifications/NotificationCenter';
import Topbar from "./Topbar";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <NotificationProvider>
    <div className="min-h-screen bg-land-page font-sans text-land-ink">
      <Sidebar
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
            onCollapseToggle={() => setSidebarCollapsed((value) => !value)}
        />

      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[240px]",
        ].join(" ")}
      >
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setSidebarOpen(true)}
          onCollapseToggle={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="min-h-[calc(100vh-64px)] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    <NotificationBanners />
    </NotificationProvider>
  );
}

export default AdminLayout;
