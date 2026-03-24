import React from 'react';
import { formatDate, CATEGORY_LABELS, getImageUrl, timeAgo } from '../../utils/helpers';

const StatusBadge = ({ status }) => (
  <span className={`badge-${status}`}>
    {status === 'pending' && '⏳'}
    {status === 'in_progress' && '🔄'}
    {status === 'completed' && '✅'}
    {status === 'rejected' && '❌'}
    {' '}{status?.replace('_', ' ')}
  </span>
);

const PriorityBadge = ({ priority }) => (
  <span className={`badge-${priority}`}>
    {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} {priority}
  </span>
);

const ComplaintCard = ({ complaint, onClick, showActions, children }) => {
  const imageUrl = getImageUrl(complaint.image);

  return (
    <div
      className="card hover:shadow-md transition-all duration-200 cursor-pointer animate-fadeInUp"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {imageUrl && (
          <img src={imageUrl} alt="complaint" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-800 truncate">{complaint.title}</h3>
              <p className="text-xs text-primary-600 font-medium">{complaint.complaintNumber}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{complaint.description}</p>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{CATEGORY_LABELS[complaint.category] || complaint.category}</span>
            {complaint.location?.address && (
              <span>📍 {complaint.location.address}</span>
            )}
            <span>🕐 {timeAgo(complaint.createdAt)}</span>
            {complaint.departmentId?.name && (
              <span>🏢 {complaint.departmentId.name}</span>
            )}
          </div>

          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
};

export { StatusBadge, PriorityBadge };
export default ComplaintCard;
