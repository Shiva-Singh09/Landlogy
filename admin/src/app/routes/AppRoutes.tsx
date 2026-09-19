import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Dashboard from "../../pages/Dashboard/Dashboard";
import Login from "../../pages/Auth/Login";
import { GuestOnly, RequireAdmin } from "./AuthGuard";
import PropertiesPage from "../../pages/Properties/Page";
import PropertyFormPage from "../../pages/Properties/Form";
import PropertyDetailPage from "../../pages/PropertyDetail/Page";
import EnquiriesPage from "../../pages/Enquiries/Page";
import EnquiryDetailPage from "../../pages/Enquiries/Detail";
import ClientsPage from "../../pages/Clients/Page";
import ClientDetailPage from "../../pages/Clients/Detail";
import NotificationsPage from '../../pages/Notifications/Page';
import ActivityPage from "../../pages/Activity/Page";
import AnalyticsPage from "../../pages/Analytics/Page";
import AccountSettingsPage from "../../pages/AccountSettings/Page";

function AppRoutes() {
  return (
    <Routes>
      {/* Public: sign-in. Already-authenticated admins are sent to /dashboard. */}
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected: the entire admin workspace requires a live admin session. */}
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route path="/properties" element={<PropertiesPage />} />

        <Route path="/properties/add" element={<PropertyFormPage key="add" />} />

        <Route path="/properties/:propertyId" element={<PropertyDetailPage />} />

        <Route path="/properties/:propertyId/edit" element={<PropertyFormPage key="edit" />} />

        <Route path="/enquiries" element={<EnquiriesPage />} />

        <Route path="/enquiries/:enquiryId" element={<EnquiryDetailPage />} />

        <Route path="/clients" element={<ClientsPage />} />

        <Route path="/clients/:clientId" element={<ClientDetailPage />} />

        <Route path="/analytics" element={<AnalyticsPage />} />

        <Route path="/recent-activity" element={<ActivityPage />} />

        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />

        <Route path="/account-settings" element={<AccountSettingsPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
