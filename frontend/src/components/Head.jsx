const Head = ({ title, description, actions }) => {
  if (!title && !description && !actions) {
    return null;
  }

    return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-0 flex items-start gap-3">
        <button 
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
            className="lg:hidden mt-1 p-2 -ml-2 rounded-lg bg-white shadow-sm border border-[#e6ebfa] text-gray-700 shrink-0"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
        <div className="space-y-1">
          {title && (
            <h1 className="text-2xl font-semibold text-[#1f2937] leading-tight">{title}</h1>
          )}
          {description && (
            <p className="text-sm text-[#64748b] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center shrink-0">
          {actions}
        </div>
      )}
    </div>
    );
};

export default Head;
