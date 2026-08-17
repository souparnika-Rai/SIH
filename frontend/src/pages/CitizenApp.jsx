import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Upload, CheckCircle, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CitizenApp() {
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [rawFile, setRawFile] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [toast, setToast] = useState(null);

  // Poll for active issue updates
  useEffect(() => {
    let interval;
    if (activeIssue && activeIssue.status !== 'Resolved' && activeIssue.status !== 'Declined') {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/issues");
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data)) {
            const updated = data.find(i => i.id === activeIssue.id);
            if (updated) setActiveIssue(updated);
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeIssue]);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setImage(URL.createObjectURL(file));
      getLocation();
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Please enable location services to tag this issue.");
          setLocation({ lat: 12.9716, lng: 77.5946 });
        }
      );
    } else {
      setLocation({ lat: 12.9716, lng: 77.5946 });
    }
  };

  const submitIssue = async () => {
    setIsSubmitting(true);
    
    if (!location) {
      alert("Location is required.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", rawFile);
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setActiveIssue(data);
      setToast("Report sent successfully!");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error submitting issue:", error);
      alert("Failed to connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await fetch(`http://127.0.0.1:8000/issues/${activeIssue.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setActiveIssue({ ...activeIssue, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full p-6 pt-12 space-y-6 pb-24 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Report Issue</h1>
        <p className="text-gray-500 text-sm">Capture a photo of the infrastructure defect to notify authorities instantly.</p>
      </div>

      {!activeIssue ? (
        <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden group">
            {image ? (
              <img src={image} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Camera className="w-10 h-10 text-gray-400 mb-3 group-hover:text-blue-500 transition-colors" />
                <p className="mb-2 text-sm text-gray-500 font-bold">Tap to capture or upload</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </label>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <div className={`p-2 rounded-full ${location ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Location</p>
              <p className="text-xs text-gray-500">
                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Waiting for GPS...'}
              </p>
            </div>
          </div>

          <button
            onClick={submitIssue}
            disabled={!image || isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Analyzing via AI...</span>
            ) : (
              <>
                <Upload className="w-5 h-5" /> Submit Report
              </>
            )}
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-sm border p-6 overflow-hidden relative"
          >
            {/* Status Header */}
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="bg-blue-100 p-2.5 rounded-full text-blue-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Report Status</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{activeIssue.status}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                <span className="text-gray-500 font-semibold">Detected</span>
                <span className="font-extrabold text-gray-900">{activeIssue.type} ({activeIssue.confidence})</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                <span className="text-gray-500 font-semibold">Priority</span>
                <span className="font-extrabold text-red-600">{activeIssue.priority}/100</span>
              </div>
            </div>

            {/* If Worker Completed, show verification */}
            {activeIssue.status === 'Completed' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 border-t pt-6">
                <h4 className="font-bold text-gray-900 mb-2">Worker Verification</h4>
                <p className="text-xs text-gray-500 mb-4">The maintenance worker has uploaded a photo claiming this is fixed. Please verify.</p>
                <img src={activeIssue.worker_image} alt="Repaired" className="w-full h-40 object-cover rounded-xl mb-4 border shadow-sm" />
                
                <div className="flex gap-3">
                  <button onClick={() => updateStatus('Resolved')} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                  <button onClick={() => updateStatus('Declined')} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                </div>
              </motion.div>
            )}

            {/* Resolved / Declined States */}
            {activeIssue.status === 'Resolved' && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 border border-green-200">
                <CheckCircle className="w-5 h-5" /> Issue closed successfully. Thank you!
              </div>
            )}
            
            {activeIssue.status === 'Declined' && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl font-bold flex items-start gap-2 border border-red-200 text-sm">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" /> You rejected the repair. Authorities have been notified and will review the case.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
