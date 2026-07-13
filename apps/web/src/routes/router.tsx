import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { HomePage } from "../features/construction-opportunities/pages/HomePage";
import { DashboardPage } from "../features/construction-opportunities/pages/DashboardPage";
import { OpportunityWizardPage } from "../features/construction-opportunities/pages/OpportunityWizardPage";
import { OpportunityListPage } from "../features/construction-opportunities/pages/OpportunityListPage";
import { OpportunityDetailPage } from "../features/construction-opportunities/pages/OpportunityDetailPage";
import { OpportunityMapPage } from "../features/construction-opportunities/pages/OpportunityMapPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "map", element: <OpportunityMapPage /> },
      { path: "new", element: <OpportunityWizardPage /> },
      { path: "opportunities/:id/edit", element: <OpportunityWizardPage /> },
      { path: "opportunities", element: <OpportunityListPage /> },
      { path: "opportunities/:id", element: <OpportunityDetailPage /> },
    ],
  },
]);
