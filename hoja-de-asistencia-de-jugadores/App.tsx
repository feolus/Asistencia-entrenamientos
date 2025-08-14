import React, { useState, useCallback } from 'react';
import { AttendanceTable } from './components/AttendanceTable';
import type { Player } from './types';
import { AttendanceStatus } from './types';
import { GoogleDriveSync } from './components/GoogleDriveSync';

const INITIAL_TRAINING_DATES = ['2025-08-01', '2025-08-02', '2025-08-03'];

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: 'Ana García', attendance: [AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Absent] },
  { id: 2, name: 'Juan Pérez', attendance: [AttendanceStatus.Present, AttendanceStatus.Absent, AttendanceStatus.Injured] },
  { id: 3, name: 'María López', attendance: [AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Present] },
];

/**
 * Calculates the next day after the latest date in the provided list.
 * @param dates An array of date strings in 'YYYY-MM-DD' format.
 * @returns The next date string in 'YYYY-MM-DD' format.
 */
const getNextAvailableDate = (dates: string[]): string => {
  const lastDate = new Date();
  if (dates.length > 0) {
    // The dates array is assumed to be sorted, so the last element is the latest date.
    const latestDateString = dates[dates.length - 1];
    // Add 'T00:00:00' to avoid timezone issues where new Date(YYYY-MM-DD) might be the previous day.
    const lastDateUTC = new Date(latestDateString + 'T00:00:00');
    lastDate.setTime(lastDateUTC.getTime());
  } else {
    // If no dates exist, provide a sensible default start date (e.g., day before the first typical training).
    lastDate.setFullYear(2025, 6, 31); // July 31, 2025
  }
  lastDate.setDate(lastDate.getDate() + 1);
  return lastDate.toISOString().split('T')[0];
};


const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [trainingDates, setTrainingDates] = useState<string[]>(() => [...INITIAL_TRAINING_DATES].sort());
  const [newTrainingDate, setNewTrainingDate] = useState<string>(() => getNextAvailableDate(trainingDates));

  const handleDriveDataLoaded = useCallback((data: { players: Player[], trainingDates: string[] }) => {
    if (data.players && Array.isArray(data.players) && data.trainingDates && Array.isArray(data.trainingDates)) {
      setPlayers(data.players);
      setTrainingDates(data.trainingDates);
      setNewTrainingDate(getNextAvailableDate(data.trainingDates));
      alert('¡Datos cargados correctamente desde Google Drive!');
    } else {
      alert('No se pudieron cargar los datos. El formato del archivo podría ser incorrecto o estar dañado.');
    }
  }, []);

  const handleUpdatePlayerName = useCallback((playerId: number, newName: string) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === playerId ? { ...player, name: newName } : player
      )
    );
  }, []);

  const handleUpdateAttendance = useCallback((playerId: number, dayIndex: number, newStatus: AttendanceStatus | null) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === playerId) {
          const newAttendance = [...player.attendance];
          newAttendance[dayIndex] = newStatus;
          return { ...player, attendance: newAttendance };
        }
        return player;
      })
    );
  }, []);

  const handleAddPlayer = useCallback(() => {
    const newPlayer: Player = {
      id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
      name: `Jugador ${players.length + 1}`,
      attendance: Array(trainingDates.length).fill(null),
    };
    setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
  }, [players, trainingDates.length]);

  const handleAddTraining = useCallback(() => {
    if (!newTrainingDate) {
      alert('Por favor, selecciona una fecha.');
      return;
    }
    
    if (trainingDates.includes(newTrainingDate)) {
      alert('Esta fecha de entrenamiento ya existe. Por favor, elige otra.');
      return;
    }

    const updatedDates = [...trainingDates, newTrainingDate].sort();
    const newDateIndex = updatedDates.indexOf(newTrainingDate);

    setTrainingDates(updatedDates);
    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        const newAttendance = [...player.attendance];
        // Insert 'null' at the correct index for the new date to keep attendance in sync.
        newAttendance.splice(newDateIndex, 0, null);
        return { ...player, attendance: newAttendance };
      })
    );

    // After adding, update the date picker to suggest the next available date.
    setNewTrainingDate(getNextAvailableDate(updatedDates));
  }, [newTrainingDate, trainingDates]);

  const handleRemovePlayer = useCallback((playerId: number) => {
    setPlayers(prevPlayers => prevPlayers.filter(player => player.id !== playerId));
  }, []);


  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
            Hoja de Asistencia de Jugadores
          </h1>
        </header>

        <GoogleDriveSync
          appData={{ players, trainingDates }}
          onDataLoaded={handleDriveDataLoaded}
        />

        <div className="mt-8 mb-6 flex flex-wrap gap-4 items-end justify-center sm:justify-start">
          <button
            onClick={handleAddPlayer}
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
          >
            + Añadir Jugador
          </button>
          
          <div className="flex items-end gap-2">
            <div className="flex flex-col">
              <label htmlFor="training-date" className="text-sm font-medium text-slate-700 mb-1 px-1">
                Fecha de Entrenamiento
              </label>
              <input
                type="date"
                id="training-date"
                value={newTrainingDate}
                onChange={(e) => setNewTrainingDate(e.target.value)}
                className="px-3 h-[42px] border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleAddTraining}
              disabled={!newTrainingDate || trainingDates.includes(newTrainingDate)}
              className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none"
              title={trainingDates.includes(newTrainingDate) ? 'Esta fecha ya existe' : 'Añadir nueva fecha de entrenamiento'}
            >
              + Añadir Entrenamiento
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
           <div className="overflow-x-auto">
              <AttendanceTable
                players={players}
                trainingDates={trainingDates}
                onUpdatePlayerName={handleUpdatePlayerName}
                onUpdateAttendance={handleUpdateAttendance}
                onRemovePlayer={handleRemovePlayer}
              />
            </div>
        </div>
        
        <footer className="mt-12 text-center text-sm text-slate-500">
          <p>Creado para replicar la funcionalidad de una hoja de cálculo de asistencia dinámica.</p>
          <p>Haz clic en los iconos de asistencia para cambiar el estado (Presente → Ausente → Lesión → Vacío).</p>
        </footer>
      </div>
    </div>
  );
};

export default App;