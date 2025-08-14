/// <reference types="vite/client" />

import React, { useState, useEffect, useCallback } from 'react';
import type { Player } from '../types';
import { AttendanceStatus } from '../types';
import { GoogleIcon } from './icons/GoogleIcon';
import { Modal } from './Modal';

declare const gapi: any;
declare const google: any;

interface GoogleDriveSyncProps {
    appData: {
        players: Player[];
        trainingDates: string[];
    };
    onDataLoaded: (data: { players: Player[], trainingDates: string[] }) => void;
}

const DRIVE_FILE_NAME = 'hoja-asistencia-jugadores-data.json';
const DRIVE_FILE_ID_KEY = 'googleDriveFileId_asistencia';

// Vite exposes env variables through `import.meta.env`
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// API Discovery Docs and Scopes
const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SHEETS_DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
// Add sheets scope to allow creating and writing to Google Sheets.
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ appData, onDataLoaded }) => {
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setIsGapiReady(true);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const initializeGapiClient = useCallback(() => {
        gapi.load('client', async () => {
            // Load both Drive and Sheets APIs
            await gapi.client.init({
                discoveryDocs: [DRIVE_DISCOVERY_DOC, SHEETS_DISCOVERY_DOC],
            });
        });
    }, []);

    useEffect(() => {
        if (isGapiReady) {
            initializeGapiClient();
            if (CLIENT_ID) {
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (tokenResponse: any) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            gapi.client.setToken(tokenResponse);
                            setIsSignedIn(true);
                            fetchUserProfile();
                        }
                    },
                });
                setTokenClient(client);
            }
        }
    }, [isGapiReady, initializeGapiClient]);

    const handleAuthClick = () => {
        if (!CLIENT_ID) {
            alert('El Google Client ID no está configurado. El administrador del sitio debe añadirlo a las variables de entorno.');
            return;
        }
        if (tokenClient) {
            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        }
    };

    const handleSignoutClick = () => {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken(null);
                setIsSignedIn(false);
                setUser(null);
                setStatusMessage('Desconectado.');
            });
        }
    };
    
    const fetchUserProfile = async () => {
        try {
            const response = await gapi.client.request({
                'path': 'https://www.googleapis.com/oauth2/v3/userinfo'
            });
            setUser(response.result);
            setStatusMessage(`Conectado como: ${response.result.email}`);
        } catch (error) {
            console.error('Error fetching user profile', error);
        }
    };
    
    const findFile = useCallback(async () => {
        setStatusMessage('Buscando archivo en Drive...');
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${DRIVE_FILE_NAME}' and trashed=false and 'me' in owners`,
                spaces: 'drive',
                fields: 'files(id, name)',
            });
            if (response.result.files && response.result.files.length > 0) {
                const fileId = response.result.files[0].id;
                localStorage.setItem(DRIVE_FILE_ID_KEY, fileId);
                setStatusMessage('Archivo de datos encontrado.');
                return fileId;
            } else {
                setStatusMessage('No se encontró un archivo de datos. Se creará uno nuevo al guardar.');
                return null;
            }
        } catch (err) {
            console.error('Error finding file', err);
            setStatusMessage('Error al buscar el archivo en Drive.');
            return null;
        }
    }, []);

    const handleSaveData = async () => {
        if (!isSignedIn) {
            alert('Debes conectar tu cuenta de Google primero.');
            return;
        }
        setIsLoading(true);
        setStatusMessage('Guardando datos en Google Drive...');
        
        let fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);
        if (!fileId) {
           fileId = await findFile();
        }

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const metadata = {
            name: DRIVE_FILE_NAME,
            mimeType: 'application/json',
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(appData, null, 2) +
            close_delim;

        const request = gapi.client.request({
            path: `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}`,
            method: fileId ? 'PATCH' : 'POST',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            body: multipartRequestBody,
        });

        request.execute((file: any, err: any) => {
            setIsLoading(false);
            if (err) {
                console.error('Error saving data:', err);
                setStatusMessage(`Error al guardar: ${err.result?.error?.message || 'desconocido'}.`);
            } else {
                localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
                setStatusMessage('¡Datos guardados en Google Drive correctamente!');
            }
        });
    };

    const handleLoadData = async () => {
        if (!isSignedIn) {
            alert('Debes conectar tu cuenta de Google primero.');
            return;
        }

        if (!window.confirm('¿Estás seguro de que quieres cargar los datos desde Google Drive? Se sobrescribirán los cambios no guardados.')) {
            return;
        }
        
        setIsLoading(true);
        setStatusMessage('Cargando datos desde Google Drive...');

        let fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);
        if (!fileId) {
            fileId = await findFile();
        }

        if (!fileId) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            onDataLoaded(response.result);
        } catch (err: any) {
            console.error('Error loading data', err);
            setStatusMessage(`Error al cargar los datos: ${err.result?.error?.message || 'desconocido'}.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportToSheets = async () => {
        if (!isSignedIn) {
            alert('Debes conectar tu cuenta de Google primero.');
            return;
        }
        setIsExporting(true);
        setStatusMessage('Exportando a Google Sheets...');

        try {
            // 1. Prepare data for Sheets API
            const { players, trainingDates } = appData;
            const formatDate = (dateString: string) => new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });

            const headers = [
                'Nombre del Jugador',
                ...trainingDates.map(formatDate),
                'Total Asistencias',
                'Total Ausencias',
                'Total Lesiones',
                '% Asistencia',
            ];

            const attendanceToSymbol = (status: AttendanceStatus | null) => {
                switch(status) {
                    case AttendanceStatus.Present: return 'P';
                    case AttendanceStatus.Absent: return 'A';
                    case AttendanceStatus.Injured: return 'L';
                    default: return '';
                }
            };
            
            const playerRows = players.map(player => {
                const totalPresent = player.attendance.filter(s => s === AttendanceStatus.Present).length;
                const totalAbsent = player.attendance.filter(s => s === AttendanceStatus.Absent).length;
                const totalInjured = player.attendance.filter(s => s === AttendanceStatus.Injured).length;
                const totalRecorded = totalPresent + totalAbsent + totalInjured;
                const percentage = totalRecorded === 0 ? 0 : (totalPresent / totalRecorded);

                return [
                    player.name,
                    ...player.attendance.map(attendanceToSymbol),
                    totalPresent,
                    totalAbsent,
                    totalInjured,
                    `${(percentage * 100).toFixed(0)}%`,
                ];
            });

            const values = [headers, ...playerRows];

            // 2. Create the spreadsheet
            const spreadsheetBody = {
                properties: {
                    title: `Hoja de Asistencia - ${new Date().toLocaleString('es-ES')}`
                },
                sheets: [{
                    properties: { title: 'Asistencia' },
                    data: [{
                        rowData: values.map(row => ({
                            values: row.map(cellValue => ({
                                userEnteredValue: {
                                    stringValue: String(cellValue)
                                }
                            }))
                        }))
                    }]
                }]
            };

            const response = await gapi.client.sheets.spreadsheets.create({}, spreadsheetBody);
            
            const sheetUrl = response.result.spreadsheetUrl;
            setStatusMessage(
                <span>
                    ¡Exportado con éxito!{' '}
                    <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                        Abrir Hoja de Cálculo
                    </a>
                </span>
            );

        } catch (err: any) {
            console.error('Error exporting to sheets:', err);
            setStatusMessage(`Error al exportar: ${err.result?.error?.message || 'desconocido'}. Puede que necesites reconectarte para aceptar los nuevos permisos.` );
        } finally {
            setIsExporting(false);
        }
    };

    if (!CLIENT_ID) {
        return (
             <div className="p-4 bg-white rounded-lg shadow-md mb-6 border border-amber-400">
                <h2 className="text-lg font-bold text-amber-700 mb-2">Configuración Requerida</h2>
                <p className="text-amber-600">La funcionalidad de Google Drive está deshabilitada porque el <strong>Google Client ID</strong> no ha sido configurado por el administrador del sitio.</p>
             </div>
        )
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 mb-3">Sincronización con Google</h2>
            {!isSignedIn ? (
                <div className="flex flex-wrap items-center gap-4">
                    <p className="text-slate-600 flex-grow">Conecta tu cuenta de Google para guardar, cargar o exportar tus datos.</p>
                    <button
                        onClick={handleAuthClick}
                        disabled={!isGapiReady || !tokenClient}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        <GoogleIcon />
                        Conectar con Google
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                     <div>
                        <p className="font-medium text-slate-800">¡Conectado!</p>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSignoutClick} className="text-sm text-slate-500 hover:text-red-600">Desconectar</button>
                        <button onClick={handleLoadData} disabled={isLoading || isExporting} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50">Cargar desde Drive</button>
                        <button onClick={handleSaveData} disabled={isLoading || isExporting} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">Guardar en Drive</button>
                        <button onClick={handleExportToSheets} disabled={isExporting || isLoading} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          {isExporting ? 'Exportando...' : 'Exportar a Sheets'}
                        </button>
                    </div>
                </div>
            )}
            {statusMessage && <p className={`mt-3 text-sm ${(isLoading || isExporting) ? 'animate-pulse' : ''}`}>{statusMessage}</p>}
        </div>
    );
};