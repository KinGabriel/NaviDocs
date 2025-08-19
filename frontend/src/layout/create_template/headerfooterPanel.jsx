import { useState } from 'react';

export default function HeaderFooterPanel() {

  const [tab, setTab] = useState('header');
  const [headerContent, setHeaderContent] = useState({
    fullName: false,
    studentId: false,
    course: false,
    date: false,
    university: false,
    school: false,
    custom: '',
    alignment: 'left',
  });

  const [footerContent, setFooterContent] = useState({
    pageNumber: false,
    email: false,
    university: false,
    custom: '',
    alignment: 'center',
  });

  const handleChange = (section, field, value = null) => {
    const update = section === 'header' ? { ...headerContent } : { ...footerContent };
    update[field] = value !== null ? value : !update[field];
    section === 'header' ? setHeaderContent(update) : setFooterContent(update);
  };

  const handleAlignment = (section, alignment) => {
    section === 'header'
      ? setHeaderContent({ ...headerContent, alignment })
      : setFooterContent({ ...footerContent, alignment });
  };

  const renderContent = (section) => {
    const data = section === 'header' ? headerContent : footerContent;

    return (
      <div className="space-y-6 space-x-3 p-5">
        <div className="grid grid-cols-2 gap-4">
          {section === 'header' ? (
            <>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.fullName} onChange={() => handleChange(section, 'fullName')} /> Full Name
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.studentId} onChange={() => handleChange(section, 'studentId')} /> Student ID
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.course} onChange={() => handleChange(section, 'course')} /> Course
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.date} onChange={() => handleChange(section, 'date')} /> Date
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.university} onChange={() => handleChange(section, 'university')} /> University
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.school} onChange={() => handleChange(section, 'school')} /> School
              </label>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.pageNumber} onChange={() => handleChange(section, 'pageNumber')} /> Page Number
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.email} onChange={() => handleChange(section, 'email')} /> Email
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={data.university} onChange={() => handleChange(section, 'university')} /> University
              </label>
            
            </>
          )}
        </div>

         {/* custom text input */}
        <div>
          <label className="block text-sm font-medium mb-1">Custom Text:</label>
          <textarea
            className="border rounded px-2 py-1 w-full"
            value={data.custom}
            onChange={(e) => handleChange(section, 'custom', e.target.value)}
            placeholder="e.g. Thesis Title, Semester, etc."
          />
        </div>

        {/* alignment */}
        <div>
          <h3 className="block text-sm font-semibold mb-1">Alignment</h3>
          <div className="grid grid-cols-2 gap-4">
            {['left', 'right', 'center', 'justified'].map((align) => (
              <div key={align} className="flex flex-col items-center">
                <button
                  onClick={() => handleAlignment(section, align)}
                  className={`border rounded-lg p-3 w-30 h-14 hover:border-blue-500 ${
                    data.alignment === align ? 'border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {align === 'left' && (
                    <>
                      <div className="w-3/4 h-2 bg-gray-300 mb-1 rounded" />
                      <div className="w-1/2 h-2 bg-gray-300 rounded" />
                    </>
                  )}
                  {align === 'right' && (
                    <>
                      <div className="w-3/4 h-2 bg-gray-300 mb-1 rounded ml-auto" />
                      <div className="w-1/2 h-2 bg-gray-300 rounded ml-auto" />
                    </>
                  )}
                  {align === 'center' && (
                    <>
                      <div className="w-4/5 h-2 bg-gray-300 mb-1 rounded mx-auto" />
                      <div className="w-2/3 h-2 bg-gray-300 rounded mx-auto" />
                      <div className="w-4/5 h-2 bg-gray-300 mt-1 rounded mx-auto" />
                    </>
                  )}
                  {align === 'justified' && (
                    <>
                      <div className="w-full h-2 bg-gray-300 mb-1 rounded" />
                      <div className="w-full h-2 bg-gray-300 mb-1 rounded" />
                      <div className="w-full h-2 bg-gray-300 rounded" />
                    </>
                  )}
                </button>
                <span className="mt-1 text-xs capitalize">{align}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

 {/*section for header and footer options*/}
  return (
    <div className="p-9 space-y-6">
      <div className="flex space-x-4 border-b">
        <button
          className={`px-6 py-2 ${
            tab === 'header'
              ? 'border-b-2 border-[#063c8d] font-semibold text-[#063c8d]'
              : 'text-gray-500'
          }`}
          onClick={() => setTab('header')}
        >
          Header
        </button>
        <button
          className={`px-6 py-2 ${
            tab === 'footer'
              ? 'border-b-2 border-[#063c8d] font-semibold text-[#063c8d]'
              : 'text-gray-500'
          }`}
          onClick={() => setTab('footer')}
        >
          Footer
        </button>
      </div>

      <div>{renderContent(tab)}</div>
    </div>
);
};