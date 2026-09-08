import React, { useState, useEffect } from 'react';
import { Camera, MapPin, CheckCircle, Navigation, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function WorkerApp() {
  const { t } = useTranslation();
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [task, setTask] = useState(null);

  // Poll for assigned tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/issues`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          // Worker only cares about Assigning or Assigned tasks
          const myTask = data.find(i => i.status === 'Assigning' || i.status === 'Assigned');
          setTask(myTask || null);
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      }
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateTaskStatus = async (newStatus, workerImage = null) => {
    if (!task) return;
    try {
      await fetch(`http://${window.location.hostname}:8000/issues/${task.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus, 
          worker_image: workerImage
        }),
      });
      setTask({ ...task, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const acceptWork = () => {
    updateTaskStatus('Assigned');
  };

  const verifyRepair = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const finalImage = base64Image || "https://images.unsplash.com/photo-1590740924976-189f3a6963c6?auto=format&fit=crop&q=80&w=400";
      updateTaskStatus('Completed', finalImage);
      setIsVerifying(false);
      setImage(null);
      setBase64Image(null);
    }, 1000);
  };

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <Loader2 className="w-12 h-12 text-gray-300 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">No Pending Tasks</h2>
        <p className="text-gray-500 mt-2">Waiting for the admin to assign a new maintenance job to you...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full p-6 pt-12 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">{t('worker_title')}</h1>
        <p className="text-gray-500 text-sm">{t('worker_subtitle')}</p>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-extrabold text-red-700 text-lg">{t(task.type.toLowerCase().replace(' ', '_')) || task.type}</h2>
          <span className="bg-red-600 text-white text-[10px] uppercase px-2 py-1 rounded font-bold">{t(task.severity.toLowerCase()) || task.severity}</span>
        </div>
        
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center gap-2 text-red-900/80 text-sm font-medium">
            <MapPin className="w-4 h-4" /> {task.location}
          </div>
          {task.ward && (
            <div className="text-red-800 text-xs font-bold bg-red-100 px-2 py-1 rounded w-fit">
              Dept/Ward: {task.ward}
            </div>
          )}
        </div>

        {task.status === 'Assigning' ? (
          <button onClick={acceptWork} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-yellow-500/20">
            {t('accept_task')}
          </button>
        ) : task.status === 'Assigned' ? (
          <div className="space-y-3">
            <button 
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`, '_blank')}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Navigation className="w-4 h-4" /> {t('navigate_site')}
            </button>
          </div>
        ) : task.status === 'Completed' ? (
          <div className="flex items-center gap-2 text-green-700 bg-green-100 px-4 py-3 rounded-xl font-bold">
            <CheckCircle className="w-5 h-5" /> Submitted for verification.
          </div>
        ) : null}
      </div>

      {task.status === 'Assigned' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border p-6 space-y-4"
        >
          <h3 className="font-bold text-gray-800 border-b pb-2">{t('verification_title')}</h3>
          <p className="text-xs text-gray-500">{t('verification_desc')}</p>
          
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden group">
            {image ? (
              <img src={image} alt="Repaired" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm text-gray-500 font-bold">{t('take_photo')}</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </label>



          <button
            onClick={verifyRepair}
            disabled={!image || isVerifying}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            {isVerifying ? (
              <span className="animate-pulse">Uploading...</span>
            ) : (
              <>{t('submit_verification')}</>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
