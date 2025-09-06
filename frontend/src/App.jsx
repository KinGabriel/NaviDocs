import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './assets/css/global.css'
import Login from './pages/login';
import AdminDashboard from './pages/admin/adminDashboard';
import AdminAccounts from './pages/admin/adminAccounts';
import CreateUser from './pages/admin/adminCreateUser';
import AccountSettings from "./pages/accountSettings";
import Documents from "./pages/documents";
import DocumentView from "./pages/documentView";
import AdminEditUser from "./pages/admin/adminEditUser";
import DocumentControllerDashboard from './pages/document_controller/documentControllerDashboard';
import DocumentControllerTemplates from './pages/document_controller/documentControllerTemplates';
import DocumentControllerCreateTemplate from './pages/document_controller/documentControllerCreateTemplate';
import ProtectedRoute from './guards/protectedroute';
import DocumentControllerStatistics from './pages/document_controller/documentControllerStatistics';
import DocumentControllerWorkFlow from './pages/document_controller/documentControllerWorkFlow';
import NotFoundPage from './pages/error_pages/notFoundPage';
import ServerErrorPage from './pages/error_pages/serverErrorPage';
import UnauthorizedPage from './pages/error_pages/UnauthorizedPage';
import useUser from './hooks/useUser';
import SecretaryDashboard from './pages/secretary/secretaryDashboard';
import SecretaryTemplates from './pages/secretary/secretaryTemplates';
import SecretaryViewTemplates from './pages/secretary/secretaryViewTemplates';
import DeanDashboard from './pages/dean/deanDashboard';
import DeanStatistics from './pages/dean/deanStatistics';
import DeanDocumentWorkflow from './pages/dean/deanDocumentWorkflow';
import DeanTemplates from "./pages/dean/deanTemplates.jsx";
import DepartmentHeadDashboard from './pages/dept_head/departmentHeadDashboard';
import DepartmentHeadDocumentWorkflow from './pages/dept_head/departmentHeadDocumentWorkflow';
import DepartmentHeadStatistics from './pages/dept_head/departmentHeadStatistics';
import DepartmentHeadTemplates from './pages/dept_head/departmentHeadTemplates'; 
import DepartmentHeadTemplateView from './pages/dept_head/departmentHeadTemplateView';
import FacultyDashboard from './pages/faculty/facultyDashboard';
import EditableFields from './pages/editableFields';
import Storage from './pages/storage';

/** Redirect logged-in users by role; otherwise show Login */
function LoginRoute() {
 const user = useUser();
 if (user) {
   const role = user.role?.name;
   if (role === "Admin")               return <Navigate to="/admin/dashboard" replace />;
   if (role === "Document Controller") return <Navigate to="/document-controller/dashboard" replace />;
   if (role === "Secretary")           return <Navigate to="/secretary/dashboard" replace />;
   if (role === "Dean")                return <Navigate to="/dean/dashboard" replace />;
   if (role === "Department Head")     return <Navigate to="/dept-head/dashboard" replace />;
   if (role === "Faculty")             return <Navigate to="/faculty/dashboard" replace />;
 }
 return <Login />;
}


function App() {
 return(
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
         path="/admin/edit-user/:id"
         element={
           <ProtectedRoute allowedRoles={["Admin"]}>
             <AdminEditUser />
           </ProtectedRoute>
         }
       />


       {/* Document Controller Module */}
       <Route
         path="/document-controller/dashboard"
         element={
           <ProtectedRoute allowedRoles={["Document Controller"]}>
             <DocumentControllerDashboard />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/templates"
         element={
           <ProtectedRoute allowedRoles={["Document Controller"]}>
             <DocumentControllerTemplates />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/create-template"
         element={
           <ProtectedRoute allowedRoles={["Document Controller"]}>
             <DocumentControllerCreateTemplate />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/statistics"
         element={
           <ProtectedRoute allowedRoles={["Document Controller"]}>
             <DocumentControllerStatistics />
           </ProtectedRoute>
         }
       />
       <Route
         path="/document-controller/document-workflow"
         element={
           <ProtectedRoute allowedRoles={["Document Controller"]}>
             <DocumentControllerWorkFlow />
           </ProtectedRoute>
         }
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
       <Route
         path="/secretary/templates"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <SecretaryTemplates />
           </ProtectedRoute>
         }
       />
       <Route
         path="/secretary/settings"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <AccountSettings />
           </ProtectedRoute>
         }
       />
       <Route
         path="/secretary/templates/:id"
         element={
           <ProtectedRoute allowedRoles={["Secretary"]}>
             <SecretaryViewTemplates />
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
             <DeanDocumentWorkflow />
           </ProtectedRoute>
         }
       />
       <Route
         path="/dean/templates" 
         element={
            <ProtectedRoute allowedRoles={["Dean"]}>
             <DeanTemplates />
           </ProtectedRoute>
          }
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
             <DepartmentHeadDocumentWorkflow/>
           </ProtectedRoute>
         }
       />
       <Route
         path="/dept-head/templates"
         element={
           <ProtectedRoute allowedRoles={["Department Head"]}>
             <DepartmentHeadTemplates/>
           </ProtectedRoute>
         }
       />
       <Route
         path="/dept-head/templates/:id"
         element={
           <ProtectedRoute allowedRoles={["Department Head"]}>
             <DepartmentHeadTemplateView/>
           </ProtectedRoute>
         }
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

       {/* Global */}
       <Route
         path="/account/settings"
         element={
           <ProtectedRoute allowedRoles={["Admin","Document Controller","Secretary","Dean", "Department Head", "Faculty"]}>
             <AccountSettings />
           </ProtectedRoute>
         }
       />

        <Route
         path="/editable-fields"
         element={
           <ProtectedRoute allowedRoles={["Document Controller","Secretary","Dean", "Department Head", "Faculty"]}>
             <EditableFields />
           </ProtectedRoute>
         }
       />

        <Route
         path="/storage"
         element={
           <ProtectedRoute allowedRoles={["Document Controller","Secretary","Dean", "Department Head", "Faculty"]}>
             <Storage />
           </ProtectedRoute>
         }
       />

       <Route
         path="/documents"
         element={
           <ProtectedRoute allowedRoles={["Document Controller","Dean", "Department Head", "Faculty", "Secretary"]}>
             <Documents />
           </ProtectedRoute>
         }
       />

       <Route
        path="/documents/:id"
        element={
          <ProtectedRoute allowedRoles={["Document Controller","Dean","Department Head","Faculty", "Secretary"]}>
            <DocumentView />
          </ProtectedRoute>
        }
      />
      
       {/* Error Pages */}
       <Route path="*" element={<NotFoundPage />} />
       <Route path="/server-error" element={<ServerErrorPage />} />
       <Route path="/unauthorized" element={<UnauthorizedPage />} />
     </Routes>
   </Router>
 )
}


export default App;
