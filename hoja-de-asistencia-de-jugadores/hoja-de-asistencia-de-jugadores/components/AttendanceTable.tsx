import React from 'react';
import type { Player } from '../types';
import { AttendanceStatus } from '../types';
import { AttendanceCell } from './AttendanceCell';
import { ProgressBar } from './ProgressBar';

interface AttendanceTableProps {
  players: Player[];
  trainingDates: string[];
  onUpdatePlayerName: (playerId: number, newName: string) => void;
  onUpdateAttendance: (playerId: number, dayIndex: number, newStatus: AttendanceStatus | null) => void;
  onRemovePlayer: (playerId: number) => void;
}

const PlayerNameInput: React.FC<{ player: Player; onUpdatePlayerName: (id: number, name: string) => void; }> = ({ player, onUpdatePlayerName }) => {
  const [name, setName] = React.useState(player.name);

  const handleBlur = () => {
    if (name.trim() === '') {
        setName(player.name); // Revert if empty
    } else {
        onUpdatePlayerName(player.id, name);
    }
  };

  React.useEffect(() => {
    setName(player.name);
  }, [player.name]);

  return (
    <input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleBlur}
      className="w-full bg-transparent focus:bg-slate-100 rounded px-2 py-1 transition-colors outline-none"
    />
  );
};


export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  players,
  trainingDates,
  onUpdatePlayerName,
  onUpdateAttendance,
  onRemovePlayer,
}) => {
  const formatDate = (dateString: string) => {
    // Add T00:00:00 to avoid timezone issues where new Date(YYYY-MM-DD) might be interpreted as the previous day
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <table className="min-w-full divide-y divide-slate-200 border-collapse">
      <thead className="bg-slate-100">
        <tr>
          <th scope="col" className="sticky left-0 bg-slate-100 px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-48 z-10">
            Nombre del Jugador
          </th>
          {trainingDates.map(date => (
            <th key={date} scope="col" className="px-3 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[90px]">
              {formatDate(date)}
            </th>
          ))}
          <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[120px]">
            Total Asistencias
          </th>
          <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[120px]">
            Total Ausencias
          </th>
          <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[120px]">
            Total Lesiones
          </th>
          <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[150px]">
            % Asistencia
          </th>
           <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
            Acción
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {players.map(player => {
          const totalPresent = player.attendance.filter(s => s === AttendanceStatus.Present).length;
          const totalAbsent = player.attendance.filter(s => s === AttendanceStatus.Absent).length;
          const totalInjured = player.attendance.filter(s => s === AttendanceStatus.Injured).length;
          
          // Following original logic: percentage is based on all recorded sessions (present, absent, and injured)
          const totalRecorded = totalPresent + totalAbsent + totalInjured;
          const percentage = totalRecorded === 0 ? 0 : (totalPresent / totalRecorded);

          return (
            <tr key={player.id} className="hover:bg-slate-50 transition-colors">
              <td className="sticky left-0 bg-white hover:bg-slate-50 px-4 py-2 whitespace-nowrap font-medium text-slate-900 w-48 z-10">
                <PlayerNameInput player={player} onUpdatePlayerName={onUpdatePlayerName} />
              </td>
              {Array.from({ length: trainingDates.length }).map((_, dayIndex) => (
                <td key={dayIndex} className="px-3 py-2 text-center">
                  <AttendanceCell
                    status={player.attendance[dayIndex] ?? null}
                    onClick={() => {
                      const currentStatus = player.attendance[dayIndex];
                      let nextStatus: AttendanceStatus | null;
                      if (currentStatus === null) {
                        nextStatus = AttendanceStatus.Present;
                      } else if (currentStatus === AttendanceStatus.Present) {
                        nextStatus = AttendanceStatus.Absent;
                      } else if (currentStatus === AttendanceStatus.Absent) {
                        nextStatus = AttendanceStatus.Injured;
                      } else {
                        nextStatus = null;
                      }
                      onUpdateAttendance(player.id, dayIndex, nextStatus);
                    }}
                  />
                </td>
              ))}
              <td className="px-4 py-2 text-center font-semibold text-present text-lg">{totalPresent}</td>
              <td className="px-4 py-2 text-center font-semibold text-absent text-lg">{totalAbsent}</td>
              <td className="px-4 py-2 text-center font-semibold text-injured text-lg">{totalInjured}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                <ProgressBar percentage={percentage} />
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-full"
                  aria-label={`Eliminar a ${player.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                  </svg>
                </button>
              </td>
            </tr>
          );
        })}
         {players.length === 0 && (
            <tr>
                <td colSpan={trainingDates.length + 6} className="text-center py-12 text-slate-500">
                    <p className="text-lg">No hay jugadores en la lista.</p>
                    <p>Usa el botón "+ Añadir Jugador" para empezar.</p>
                </td>
            </tr>
         )}
      </tbody>
    </table>
  );
};
