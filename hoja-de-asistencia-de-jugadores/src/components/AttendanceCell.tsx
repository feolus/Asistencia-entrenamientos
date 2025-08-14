import React from 'react';
import { AttendanceStatus } from '../types';

interface AttendanceCellProps {
  status: AttendanceStatus | null;
  onClick: () => void;
}

const Icon: React.FC<{ status: AttendanceStatus | null }> = ({ status }) => {
  switch (status) {
    case AttendanceStatus.Present:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-present" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case AttendanceStatus.Absent:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-absent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case AttendanceStatus.Injured:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-injured" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
        </svg>
      );
    default:
      return <div className="h-6 w-6" />;
  }
};

export const AttendanceCell: React.FC<AttendanceCellProps> = ({ status, onClick }) => {
  const getBgColor = () => {
    switch (status) {
      case AttendanceStatus.Present: return 'bg-present-light';
      case AttendanceStatus.Absent: return 'bg-absent-light';
      case AttendanceStatus.Injured: return 'bg-injured-light';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-center h-10 w-10 mx-auto rounded-full cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-110 ${getBgColor()}`}
      role="button"
      aria-label={`Change attendance status. Current status: ${status !== null ? AttendanceStatus[status] : 'Not recorded'}`}
    >
      <Icon status={status} />
    </div>
  );
};