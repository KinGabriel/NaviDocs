import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import CreateUser from './pages/admin/adminCreateUser';
import AdminLoginActivity from './pages/admin/adminLoginActivity';
import AccountSettings from "./pages/accountSettings";
import Documents from "./pages/documents";
import PublishedTemplateView from "./pages/publishedTemplateView";
import AdminEditUser from "./pages/admin/adminEditUser";
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
import DocumentControllerCreateTemplate from './pages/document_controller/documentControllerCreateTemplate';
import ProtectedRoute from './guards/protectedroute';
import DocumentControllerSubmissions from './pages/document_controller/documentControllerSubmissions';
import DocumentControllerWorkflowView from './pages/document_controller/documentControllerWorkflowView';
import NotFoundPage from './pages/error_pages/notFoundPage';
import ServerErrorPage from './pages/error_pages/serverErrorPage';
import UnauthorizedPage from './pages/error_pages/unauthorizedPage';
import useUser from './hooks/useUser';
import SecretaryDashboard from './pages/secretary/secretaryDashboard';
import SecretarySubmissions from './pages/secretary/secretarySubmissions';
import TemplatesView from './pages/templatesView';
import DeanDashboard from './pages/dean/deanDashboard';
import DeanStatistics from './pages/dean/deanStatistics';
import DeanSubmissions from './pages/dean/deanSubmissions';
import DeanDocumentWorkflowView from './pages/dean/deanDocumentWorkflowView';
import DocControllerTemplates from "./pages/document_controller/documentControllerHandleTemplates.jsx";
import DepartmentHeadDashboard from './pages/dept_head/departmentHeadDashboard';
import DepartmentHeadSubmissions from './pages/dept_head/departmentHeadSubmissions';
import DepartmentHeadStatistics from './pages/dept_head/departmentHeadStatistics';
import DepartmentHeadDocumentWorkflowView from './pages/dept_head/departmentHeadDocumentWorkflowView';
import FacultyDashboard from './pages/faculty/facultyDashboard';
import FacultySubmissions from './pages/faculty/facultySubmissions';
import FacultyWorkflowView from './pages/faculty/facultyWorkflowView';
import EditableFields from './pages/editableFields';
import Storage from './pages/storage';
import SelectTemplate from './pages/selectTemplate'; 
import { Toaster } from 'react-hot-toast';
import RecentlyDeleted from "./pages/recentlyDeleted";
import SubmissionBin from './pages/submissionbinDetails';

/** Redirect logged-in users by role; otherwise show Login */
function LoginRoute() {
 const user = useUser();
 if (user) {
   const role = user.role?.name;
   if (role === "Admin")               return <Navigate to="/admin/dashboard" replace />;
   if (role === "Lead Document Controller") return <Navigate to="/document-controller/dashboard" replace />;
   if (role === "Document Control Officer") return <Navigate to="/document-controller/dashboard" replace />;
   if (role === "Unit Document Controller") return <Navigate to="/document-controller/dashboard" replace />;
   if (role === "Secretary")           return <Navigate to="/secretary/dashboard" replace />;
   if (role === "Dean")                return <Navigate to="/dean/dashboard" replace />;
   if (role === "Department Head")     return <Navigate to="/dept-head/dashboard" replace />;
   if (role === "Faculty")             return <Navigate to="/faculty/dashboard" replace />;
 }
 return <Login />;
}

// Render the appropriate Templates list based on the current user's role
function RoleTemplatesRouter() {
 const user = useUser();
 const role = user?.role?.name;
 if (!role) return <UnauthorizedPage />;
 // Approver roles (3 roles) use the review/handle templates view
 if (
   role === "Lead Document Controller" ||
   role === "Document Control Officer" ||
   role === "Unit Document Controller"
 ) {
   return <DocControllerTemplates />;
 }
 // Everyone else (excluding Admin) sees the main templates list
 if (
   role === "Secretary" ||
   role === "Dean" ||
   role === "Department Head" ||
   role === "Faculty"
 ) {
   return <DocumentControllerTemplates />;
 }
 return <UnauthorizedPage />;
}

function App() {
 return(
  <>
  <Toaster />
   <Router>
     <Routes>
       <Route path="/" element={<LoginRoute />} />
       <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
       <Route path="/document-controller" element={<Navigate to="/document-controller/dashboard" replace />} />

       {/* Admin Module */}
       <Route
         path="/admin/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <AdminDashboard />
           </ProtectedRoute>
         }
       />
       <Route
         path="/admin/accounts"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <AdminAccounts />
           </ProtectedRoute>
         }
       />
       <Route
         path="/admin/create-user"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <CreateUser />
           </ProtectedRoute>
         }
       />
       <Route
         path="/admin/login-activity"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <AdminLoginActivity />
           </ProtectedRoute>
         }
       />
       <Route
         path="/admin/edit-user/:id"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <AdminEditUser />
           </ProtectedRoute>
         }
       />


       {/* Document Controller Module (shared dashboard/workflow for approvers) */}
       <Route
         path="/document-controller/dashboard"
         element={
          <ProtectedRoute allowedRoles={["Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <DocumentControllerDashboard />
           </ProtectedRoute>
         }
       />
       {/* Unified Templates Route for all roles */}
       <Route
         path="/templates"
         element={
          <ProtectedRoute allowedRoles={["Secretary","Dean","Department Head","Faculty","Lead Document Controller","Document Control Officer","Unit Document Controller"]}>
             <RoleTemplatesRouter />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/create-template"
         element={
         <ProtectedRoute allowedRoles={["Secretary", "Dean", "Department Head", "Faculty"]}>
             <DocumentControllerCreateTemplate />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/document-workflow"
         element={
          <ProtectedRoute allowedRoles={["Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <DocumentControllerSubmissions />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/document-workflow/:id"
         element={<DocumentControllerWorkflowView />}
       />

       {/* Secretary Module */}
       <Route
         path="/secretary/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <SecretaryDashboard />
           </ProtectedRoute>
         }
       />
       {/* Legacy secretary templates route (optional redirect) */}
       <Route path="/secretary/templates" element={<Navigate to="/templates" replace />} />
       <Route
         path="/secretary/settings"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <AccountSettings />
           </ProtectedRoute>
         }
       />

        <Route
         path="/secretary/document-workflow"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <SecretarySubmissions/>
           </ProtectedRoute>
         }
       />

  {/* Dean Module */}
       <Route
         path="/dean/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Dean"]}>
             <DeanDashboard />
           </ProtectedRoute>
         }
       />
     
       <Route
         path="/dean/statistics"
         element={
           <ProtectedRoute allowedRoles={["Dean"]}>
             <DeanStatistics />
           </ProtectedRoute>
         }
       />
       <Route
         path="/dean/document-workflow"
         element={
           <ProtectedRoute allowedRoles={["Dean"]}>
             <DeanSubmissions />
           </ProtectedRoute>
         }
       />
       {/* Legacy dean templates route redirect to unified */}
       <Route path="/dean/templates" element={<Navigate to="/templates" replace />} />
        <Route 
         path="/dean/document-workflow/:id" 
         element={<DeanDocumentWorkflowView />}
       />
       <Route 
         path="/dean/documents/:id" 
         element={<DeanDocumentWorkflowView />}
       />

       {/* Department Head Module */}
       <Route
         path="/dept-head/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Department Head"]}>
             <DepartmentHeadDashboard />
           </ProtectedRoute>
         }
       />
      
       <Route
         path="/dept-head/statistics"
         element={
           <ProtectedRoute allowedRoles={["Department Head"]}>
             <DepartmentHeadStatistics />
           </ProtectedRoute>
         }
       />
       <Route
         path="/dept-head/document-workflow"
         element={
           <ProtectedRoute allowedRoles={["Department Head"]}>
             <DepartmentHeadSubmissions/>
           </ProtectedRoute>
         }
       />
       {/* Legacy dept-head templates route redirect to unified */}
       <Route path="/dept-head/templates" element={<Navigate to="/templates" replace />} />
       <Route 
         path="/dept-head/document-workflow/:id" 
         element={<DepartmentHeadDocumentWorkflowView />}
       />
       <Route 
         path="/department-head/documents/:id" 
         element={<DepartmentHeadDocumentWorkflowView />}
       />

       {/* Faculty Module */}
       <Route
         path="/faculty/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Faculty"]}>
             <FacultyDashboard />
           </ProtectedRoute>
         }
       />

        <Route
         path="/faculty/document-workflow"
         element={
           <ProtectedRoute allowedRoles={["Faculty"]}>
             <FacultySubmissions />
           </ProtectedRoute>
         }
       />

       <Route
         path="/faculty/document-workflow/:id"
         element={
           <ProtectedRoute allowedRoles={["Faculty"]}>
             <FacultyWorkflowView />
           </ProtectedRoute>
         }
       />

         {/* Legacy faculty templates route redirect to unified */}
         <Route path="/faculty/templates" element={<Navigate to="/templates" replace />} />

       {/* Global */}
       <Route
         path="/account/settings"
         element={
          <ProtectedRoute allowedRoles={["Admin","Secretary","Dean", "Department Head", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <AccountSettings />
           </ProtectedRoute>
         }
       />

        <Route
         path="/documents/editable-fields/:id"
         element={
            <ProtectedRoute allowedRoles={["Secretary","Dean", "Department Head", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <EditableFields />
           </ProtectedRoute>
         }
       />

        <Route
         path="/submission-details/:id"
         element={
            <ProtectedRoute allowedRoles={["Secretary","Dean", "Department Head", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <SubmissionBin />
           </ProtectedRoute>
         }
       />

        <Route
         path="/storage"
         element={
            <ProtectedRoute allowedRoles={["Secretary","Dean", "Department Head", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <Storage />
           </ProtectedRoute>
         }
       />

       <Route
        path="/storage/folders/:id"
        element={
          <ProtectedRoute allowedRoles={["Document Controller","Secretary","Dean", "Department Head", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
            <Storage />
          </ProtectedRoute>
        }
      />

       <Route
         path="/documents"
         element={
          <ProtectedRoute allowedRoles={["Dean", "Department Head", "Faculty", "Secretary", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
             <Documents />
           </ProtectedRoute>
         }
       />

       <Route
        path="/templates/published/:id"
        element={
          <ProtectedRoute allowedRoles={["Dean","Department Head","Faculty", "Secretary", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
            <PublishedTemplateView />
          </ProtectedRoute>
        }
      />

        <Route
         path="/templates/:id"
         element={
           <ProtectedRoute allowedRoles={["Secretary", "Dean","Faculty", "Department Head", "Lead Document Controller", "Document Control Officer", "Unit Document Controller" ]}>
             <TemplatesView />
           </ProtectedRoute>
         }
       />

       <Route path="/select-template"
       element={
     <ProtectedRoute allowedRoles={["Dean","Department Head","Faculty", "Secretary", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
           <SelectTemplate />
      </ProtectedRoute>
       }
      />

      <Route
        path="/recently-deleted"
        element={
          <ProtectedRoute allowedRoles={["Dean", "Department Head", "Secretary", "Faculty", "Lead Document Controller", "Document Control Officer", "Unit Document Controller"]}>
            <RecentlyDeleted />
          </ProtectedRoute>
        }
       />

      

       {/* Error Pages */}
       <Route path="*" element={<NotFoundPage />} />
       <Route path="/server-error" element={<ServerErrorPage />} />
       <Route path="/unauthorized" element={<UnauthorizedPage />} />
     </Routes>
   </Router>
 </>

)
}


export default App;
