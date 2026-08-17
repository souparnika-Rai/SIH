import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Map as MapIcon, List, Navigation, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function AdminDashboard() {
  const [view, setView] = useState('map');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issues, setIssues] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/issues");
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        setIssues(data);
        // Update selected issue data if it's currently open
        setSelectedIssue(current => data.find(i => i.id === current?.id) || current);
      }
    } catch (error) {
      console.error("Error fetching issues:", error);
    }
  };

  const updateStatus = async (issueId, newStatus) => {
    try {
      await fetch(`http://127.0.0.1:8000/issues/${issueId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchIssues();
      
      if (newStatus === 'Assigning') {
        setToast("Work assigned to nearby workers!");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getMarkerColor = (status, severity) => {
    if (status === 'Pending') return '#ef4444'; // Red
    if (status === 'Assigning') return '#8b5cf6'; // Purple
    if (status === 'Assigned') return '#eab308'; // Yellow
    if (status === 'Completed') return '#3b82f6'; // Blue
    if (status === 'Declined') return '#f97316'; // Orange
    if (status === 'Resolved') return '#22c55e'; // Green
    
    switch(severity) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  const activeIssues = issues.filter(i => i.status !== 'Resolved');

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className="w-[340px] bg-white border-r flex flex-col shadow-xl z-20">
        <div className="p-5 border-b bg-white">
          <h2 className="font-extrabold text-gray-900 text-lg tracking-tight">Infrastructure Monitoring</h2>
          <p className="text-xs text-gray-500 mt-1">Live AI Defect Analysis</p>
        </div>
        
        <div className="p-4 space-y-5 flex-1 overflow-y-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
              </div>
              <p className="text-3xl font-extrabold text-red-700">{activeIssues.filter(i => i.status === 'Pending').length}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 shadow-sm transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Assigned</span>
              </div>
              <p className="text-3xl font-extrabold text-yellow-700">{activeIssues.filter(i => i.status === 'Assigned' || i.status === 'Assigning').length}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              </div>
              <p className="text-3xl font-extrabold text-blue-700">{activeIssues.filter(i => i.status === 'Completed').length}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm transition-transform hover:scale-105">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Declined</span>
              </div>
              <p className="text-3xl font-extrabold text-orange-700">{activeIssues.filter(i => i.status === 'Declined').length}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {activeIssues.map(issue => (
                <div 
                  key={issue.id} 
                  onClick={() => {
                    setSelectedIssue(issue);
                    setView('map');
                  }}
                  className={`p-3 bg-white border rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-pointer ${selectedIssue?.id === issue.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-gray-900">{issue.type}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                      #{issue.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{issue.location}</p>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getMarkerColor(issue.status, issue.severity) }} />
                      <span className="font-semibold text-gray-700">{issue.status}</span>
                    </div>
                    <span className="text-gray-400">{issue.date}</span>
                  </div>
                </div>
              ))}
              {activeIssues.length === 0 && <p className="text-center text-gray-400 text-sm italic">No active issues.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-gray-100">
        <div className="absolute top-4 left-4 z-20 flex gap-2 p-1 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border">
          <button 
            onClick={() => setView('map')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${view === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <MapIcon className="w-4 h-4" /> Map View
          </button>
          <button 
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <List className="w-4 h-4" /> List View
          </button>
        </div>

        {view === 'map' ? (
          <div className="absolute inset-0 z-0">
            <Map
              initialViewState={{
                longitude: 77.5946,
                latitude: 12.9716,
                zoom: 12
              }}
              mapStyle={{
                version: 8,
                sources: {
                  osm: {
                    type: 'raster',
                    tiles: [
                      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap Contributors',
                  }
                },
                layers: [
                  {
                    id: 'osm',
                    type: 'raster',
                    source: 'osm',
                    minzoom: 0,
                    maxzoom: 19
                  }
                ]
              }}
            >
              <NavigationControl position="bottom-right" />
              
              {activeIssues.map((issue) => (
                <Marker 
                  key={issue.id} 
                  longitude={issue.lng} 
                  latitude={issue.lat} 
                  anchor="bottom"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedIssue(issue);
                  }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg transform transition-transform hover:scale-110 border-2 border-white ${selectedIssue?.id === issue.id ? 'animate-bounce' : ''}`}
                       style={{ backgroundColor: getMarkerColor(issue.status, issue.severity) }}>
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                </Marker>
              ))}

              <AnimatePresence>
                {selectedIssue && activeIssues.find(i => i.id === selectedIssue.id) && (
                  <Popup
                    longitude={selectedIssue.lng}
                    latitude={selectedIssue.lat}
                    anchor="top"
                    onClose={() => setSelectedIssue(null)}
                    closeOnClick={false}
                    className="z-50"
                    maxWidth="320px"
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-1 -m-2"
                    >
                      <img src={selectedIssue.status === 'Completed' || selectedIssue.status === 'Declined' ? selectedIssue.worker_image : selectedIssue.image} alt={selectedIssue.type} className="w-full h-32 object-cover rounded-t-lg" />
                      <div className="p-4 bg-white rounded-b-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{selectedIssue.type}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedIssue.location}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                            ID: #{selectedIssue.id}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 border-t pt-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: getMarkerColor(selectedIssue.status, selectedIssue.severity) }}>
                            {selectedIssue.status}
                          </span>
                          
                          {selectedIssue.status === 'Pending' && (
                            <button onClick={() => updateStatus(selectedIssue.id, 'Assigning')} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                              <Navigation className="w-3 h-3" /> Assign Worker
                            </button>
                          )}
                          
                          {selectedIssue.status === 'Declined' && (
                            <div className="flex gap-1">
                              <button onClick={() => updateStatus(selectedIssue.id, 'Resolved')} className="text-xs font-bold text-green-600 hover:bg-green-50 border border-green-200 px-2 py-1.5 rounded-md">Force Close</button>
                              <button onClick={() => updateStatus(selectedIssue.id, 'Assigning')} className="text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 px-2 py-1.5 rounded-md">Reassign</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Popup>
                )}
              </AnimatePresence>
            </Map>
          </div>
        ) : (
          <div className="flex-1 bg-white p-8 mt-20 overflow-y-auto rounded-t-3xl shadow-2xl mx-4 border">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">All Infrastructure Issues</h2>
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">ID</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Defect</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Status</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Priority</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 text-gray-500 text-sm font-medium">#{issue.id}</td>
                      <td className="p-4 font-bold text-gray-900 text-sm">{issue.type}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm" style={{ backgroundColor: getMarkerColor(issue.status, issue.severity) }}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-600">{issue.priority}/100</td>
                      <td className="p-4">
                        {issue.status === 'Pending' && (
                          <button onClick={() => updateStatus(issue.id, 'Assigning')} className="text-sm text-blue-600 font-bold hover:text-blue-800">Assign</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activeIssues.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">No active issues found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
