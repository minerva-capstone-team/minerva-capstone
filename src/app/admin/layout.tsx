import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/layout/Toaster";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Minerva Admin", statusBarStyle: "default" },
  icons: { apple: "/admin-app/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </>
  );
}
