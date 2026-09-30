import { Users } from "lucide-react";

const SidebarSkeleton = ({ className = "" }) => {
  // Create 8 skeleton items
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside className={`${className} h-full border-r border-base-300 flex-col`}>
      {/* Header */}
      <div className="border-b border-base-300 w-full p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <span className="font-semibold">Contacts</span>
        </div>
        <div className="skeleton h-8 w-full" />
      </div>

      {/* Skeleton Contacts */}
      <div className="overflow-y-auto w-full py-2">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full px-4 py-3 flex items-center gap-3">
            <div className="skeleton size-12 rounded-full shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
