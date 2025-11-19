import React, { useState } from "react";
import EditableFieldsHeader from "../../layout/editable_fields/EditableFieldsHeader";
import Panel from "../../layout/editable_fields/Panel";

export default function EditableFieldsLayout({
  // header props
  user,
  title,
  setTitle,
  onSave,
  onArchive,
  onExportPDF,
  saving,
  lastSavedAt,
  dirty,
  documentId,
  documentData,
  onDocumentUpdate,

  // panel props
  panelNumber,
  panelTitle,
  panelColor,
  panelFields,
  formData,
  onChangeField,
  onFocusField,
  duplicateCounts,
  duplicateIndices,
  onCycleDuplicate,

  // right-side document viewer
  children,
}) {
  // controls sidebar visibility on large screens (your hamburger)
  const [showSidebar, setShowSidebar] = useState(true);
  const collapsed = !showSidebar;

  return (
    <div className="flex flex-col h-screen bg-[#f3f3f3]">
      {/* HEADER */}
      <EditableFieldsHeader
        title={title}
        user={user}
        setTitle={setTitle}
        onSave={onSave}
        onArchive={onArchive}
        onExportPDF={onExportPDF}
        saving={saving}
        lastSavedAt={lastSavedAt}
        dirty={dirty}
        documentId={documentId}
        documentData={documentData}
        onDocumentUpdate={onDocumentUpdate}
        // hook up hamburger
        mobileSidebarOpen={showSidebar}
        setMobileSidebarOpen={setShowSidebar}
      />

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDE WRAPPER */}
        <aside
          className={`
            border-r border-gray-200 flex-shrink-0 z-40
            bg-[#f8f9fa]
            overflow-y-auto
            transition-all duration-200 ease-in-out
            
            /* desktop behavior */
            hidden lg:block
            ${collapsed ? "w-[56px] min-w-[56px]" : "w-[380px] max-w-[380px]"}

            /* mobile drawer behavior */
            lg:static lg:shadow-none
          `}
        >
          {/* when expanded show full panel content */}
          {!collapsed && (
            <div className="p-4 min-h-full">
              <Panel
                number={panelNumber}
                title={panelTitle}
                color={panelColor}
                fields={panelFields}
                formData={formData}
                onChange={onChangeField}
                onFocusField={onFocusField}
                user={user}
                duplicateCounts={duplicateCounts}
                duplicateIndices={duplicateIndices}
                onCycleDuplicate={onCycleDuplicate}
              />
            </div>
          )}

          {/* when collapsed, show just a vertical rail */}
          {collapsed && (
            <div className="w-full h-full flex flex-col items-center pt-4 text-[10px] text-gray-500">
              <div className="rounded-full w-2 h-2 bg-gray-400 mb-2" />
              <div className="rounded-full w-2 h-2 bg-gray-300 mb-2" />
              <div className="rounded-full w-2 h-2 bg-gray-200" />
            </div>
          )}
        </aside>

        {/* MOBILE SLIDE-IN VERSION OF THE PANEL */}
        <aside
          className={`
            bg-[#f8f9fa] border-r border-gray-200
            w-[320px] max-w-[80%] flex-shrink-0
            overflow-y-auto shadow-xl
            fixed top-[88px] bottom-0 left-0 z-50
            transition-transform duration-200 ease-in-out
            lg:hidden
            ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="p-4 min-h-full">
            <Panel
              number={panelNumber}
              title={panelTitle}
              color={panelColor}
              fields={panelFields}
              formData={formData}
              onChange={onChangeField}
              onFocusField={onFocusField}
              user={user}
              duplicateCounts={duplicateCounts}
              duplicateIndices={duplicateIndices}
              onCycleDuplicate={onCycleDuplicate}
            />
          </div>
        </aside>

        {/* dark overlay behind the drawer on mobile */}
        {!collapsed && showSidebar && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* RIGHT / DOCUMENT AREA */}
        <main
          className={`
            flex-1 overflow-y-auto bg-white
            border-l border-gray-200 lg:border-l-0
            flex flex-col
          `}
        >
          <div
            className={`
              min-h-full
              ${collapsed
                ? "w-full max-w-[900px] mx-auto p-6"
                : "p-6"}
            `}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
