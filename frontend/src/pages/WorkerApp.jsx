import React, { useState, useEffect } from 'react';
import { Camera, MapPin, CheckCircle, Navigation, Loader2, Bell, Clock, User, Calendar, FileText, Target, Play, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function WorkerApp() {
  const { t } = useTranslation();
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [task, setTask] = useState(null);
  const [step, setStep] = useState(1);

  // Poll for assigned tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/issues`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const myTask = data.find(i => i.status === 'Assigning' || i.status === 'Assigned');
          setTask(myTask || null);
          if (myTask && myTask.status === 'Assigning') setStep(1);
          if (myTask && myTask.status === 'Assigned' && step === 1) setStep(2);
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      }
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (base64Image && task?.id) {
      const analyzeImage = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
          const res = await fetch(`http://${window.location.hostname}:8000/issues/${task.id}/verify-repair`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ worker_image: base64Image }),
          });
          if (res.ok) {
            const data = await res.json();
            setAnalysisResult(data);
          }
        } catch (err) {
          console.error("Analysis failed", err);
        } finally {
          setIsAnalyzing(false);
        }
      };
      analyzeImage();
    }
  }, [base64Image, task?.id]);

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
    setStep(2);
  };

  const startWork = () => {
    setStep(3);
  };
  
  const submitWork = () => {
      setStep(4);
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 max-w-sm mx-auto"
      >
        <img src="/worker-caught-up.jpg" alt="All Caught Up" className="w-64 h-64 object-cover rounded-full mb-6 shadow-xl shadow-blue-500/10 border-4 border-white" />
        <h2 className="text-3xl font-extrabold text-gray-800 mb-3">{t('all_caught_up')}</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          {t('no_pending_tasks_now')}<br/>{t('great_work_keep_up')}
        </p>
        <div className="flex items-center gap-4 w-full justify-center opacity-40">
          <div className="h-px bg-blue-600 flex-1 max-w-[40px]"></div>
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <div className="h-px bg-blue-600 flex-1 max-w-[40px]"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
         <img src="https://ui-avatars.com/api/?name=Worker&background=facc15&color=fff&rounded=true" alt="Worker" className="w-14 h-14" />
         <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
              {t('hi_worker')}
            </h1>
            <p className="text-gray-500">{t('worker_greeting_desc')}</p>
         </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Task Details */}
        <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                    <Bell className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{t(task.type.toLowerCase().replace(' ', '_')) || task.type}</h2>
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{t(task.severity.toLowerCase()) || task.severity} Priority</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
                  <div>
                      <div className="flex items-center gap-1 text-gray-400 mb-1"><MapPin className="w-4 h-4" /> {t('gps')}</div>
                      <div className="font-medium text-xs break-words">{task.lat.toFixed(4)}, {task.lng.toFixed(4)}</div>
                      <div className="text-xs opacity-70">{t('approx_location')}</div>
                  </div>
                  <div>
                      <div className="flex items-center gap-1 text-gray-400 mb-1"><Target className="w-4 h-4" /> {t('dept_ward')}</div>
                      <div className="font-medium">{task.ward || t('roads_bridges')}</div>
                  </div>
                  <div className="col-span-2">
                      <div className="flex items-center gap-1 text-gray-400 mb-1"><Calendar className="w-4 h-4" /> {t('assigned_on')}</div>
                      <div className="font-medium">{new Date().toLocaleString()}</div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                     <FileText className="w-4 h-4 text-gray-400" /> {t('task_description')}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                     {t('task_description_text').replace("{{type}}", task.type.toLowerCase())}
                  </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                     <div className="text-gray-400 mb-1"><Info className="w-5 h-5"/></div>
                     <div className="text-xs text-gray-500">{t('issue_type_label')}</div>
                     <div className="font-semibold text-sm text-gray-800">{t('road_maint')}</div>
                  </div>
                  <div>
                     <div className="text-gray-400 mb-1"><Target className="w-5 h-5"/></div>
                     <div className="text-xs text-gray-500">Priority</div>
                     <div className="font-semibold text-sm text-gray-800">{task.severity}</div>
                  </div>
                  <div>
                     <div className="text-gray-400 mb-1"><Clock className="w-5 h-5"/></div>
                     <div className="text-xs text-gray-500">{t('est_time')}</div>
                     <div className="font-semibold text-sm text-gray-800">{t('hours_1_2')}</div>
                  </div>
                  <div>
                     <div className="text-gray-400 mb-1"><User className="w-5 h-5"/></div>
                     <div className="text-xs text-gray-500">{t('reported_by')}</div>
                     <div className="font-semibold text-sm text-gray-800">{t('citizen_report')}</div>
                  </div>
              </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 mt-auto">
             <div className="text-blue-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7v1"/><path d="M5.6 5.6l.7.7"/><path d="M18.4 5.6l-.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="M5.6 18.4l.7-.7"/><path d="M18.4 18.4l-.7-.7"/><path d="M12 11v4"/></svg>
             </div>
             <div>
                <div className="text-blue-900 font-bold text-sm">{t('safe_roads')}</div>
                <div className="text-blue-700 text-xs">{t('thank_you_hard_work')}</div>
             </div>
          </div>
        </div>

        {/* Middle Column - Map & Media */}
        <div className="flex flex-col gap-6">
          <div className="h-48 md:h-64 rounded-3xl overflow-hidden relative shadow-sm border border-gray-200">
             <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`, '_blank')} className="absolute top-4 right-4 z-10 bg-white text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1 hover:bg-gray-50">
               <MapPin className="w-3.5 h-3.5" /> {t('view_on_map')}
             </button>
             <Map
                initialViewState={{ longitude: task.lng, latitude: task.lat, zoom: 14 }}
                mapStyle={{
                  version: 8,
                  sources: { osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap' } },
                  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
                }}
              >
                <Marker longitude={task.lng} latitude={task.lat}>
                  <div className="text-red-500"><MapPin className="w-8 h-8 fill-current" /></div>
                </Marker>
              </Map>
          </div>
          
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm flex-1 flex flex-col min-h-[250px]">
             {task.image ? (
                <img src={task.image} alt="Reported issue" className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                   {t('no_image_provided')}
                </div>
             )}
             <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500 font-bold">
                 <Camera className="w-4 h-4" /> {t('reported_image')}
             </div>
          </div>
        </div>

        {/* Right Column - Status & Timeline */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 flex flex-col">
           <div className="bg-green-50 rounded-2xl p-4 flex items-start gap-3 mb-8">
              <Clock className="w-6 h-6 text-green-600 mt-1" />
              <div>
                 <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('task_status')}</div>
                 <div className="text-2xl font-black text-green-600 leading-tight">{task.status === 'Assigning' ? t('new_task') : t('assigned')}</div>
                 <div className="text-xs text-gray-600 mt-1">{t('start_update_progress')}</div>
              </div>
           </div>

           <div className="flex-1 px-2">
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
                 
                 {/* Step 1 */}
                 <div className="relative pl-8">
                    <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                       {step > 1 ? '✓' : '1'}
                    </div>
                    <div className={`text-sm font-bold ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>{t('view_assess')}</div>
                 </div>

                 {/* Step 2 */}
                 <div className="relative pl-8">
                    <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                       {step > 2 ? '✓' : '2'}
                    </div>
                    <div className={`text-sm font-bold ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>{t('work_in_progress')}</div>
                 </div>

                 {/* Step 3 */}
                 <div className="relative pl-8">
                    <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > 3 ? 'bg-green-500 text-white' : step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                       {step > 3 ? '✓' : '3'}
                    </div>
                    <div className={`text-sm font-bold ${step >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>{t('mark_as_completed')}</div>
                 </div>

                 {/* Step 4 */}
                 <div className="relative pl-8">
                    <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > 4 ? 'bg-green-500 text-white' : step === 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                       {step > 4 ? '✓' : '4'}
                    </div>
                    <div className={`text-sm font-bold ${step >= 4 ? 'text-gray-900' : 'text-gray-400'}`}>{t('submit_photo_update')}</div>
                 </div>
              </div>
           </div>

           <div className="mt-8 space-y-3">
              {step === 1 && (
                  <button onClick={acceptWork} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                    <Play className="w-4 h-4 fill-current" /> Accept Task
                  </button>
              )}
              {step === 2 && (
                  <button onClick={startWork} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                    <Play className="w-4 h-4 fill-current" /> {t('start_work')}
                  </button>
              )}
              {step === 3 && (
                  <button onClick={submitWork} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                    <CheckCircle className="w-4 h-4" /> {t('finish_work')}
                  </button>
              )}
              {step === 4 && (
                 <div className="space-y-4">
                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden group">
                        {image ? (
                           <>
                             <img src={image} alt="Repaired" className="absolute inset-0 w-full h-full object-cover" />
                             <div className="absolute bottom-2 bg-white/90 text-gray-900 px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-2 text-[10px] backdrop-blur-sm">
                               <Camera className="w-3 h-3" /> {t('tap_to_change')}
                             </div>
                           </>
                        ) : (
                           <div className="flex flex-col items-center justify-center">
                             <Camera className="w-6 h-6 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                             <p className="text-xs text-gray-500 font-bold">{t('take_photo')}</p>
                           </div>
                        )}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                     </label>

                     {isAnalyzing && (
                        <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-xl font-bold text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing_ai')}
                        </div>
                     )}
                     
                     {analysisResult && analysisResult.is_duplicate && (
                        <div className="text-red-600 bg-red-50 px-3 py-2 rounded-xl font-bold text-xs text-center">
                          {t('duplicate_image')}
                        </div>
                     )}
                     
                     {analysisResult && !analysisResult.is_duplicate && !analysisResult.is_solved && (
                        <div className="text-red-600 bg-red-50 px-3 py-2 rounded-xl font-bold text-xs text-center">
                          {t('problem_not_solved')}
                        </div>
                     )}

                     <button
                        onClick={verifyRepair}
                        disabled={!image || isVerifying || isAnalyzing || !analysisResult || analysisResult.is_duplicate || !analysisResult.is_solved}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
                     >
                        {isVerifying ? (
                          <span className="animate-pulse">Uploading...</span>
                        ) : (
                          <>{t('submit_verification')}</>
                        )}
                     </button>
                 </div>
              )}
              {step < 4 && (
                 <button className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                   <Calendar className="w-4 h-4" /> {t('view_task_details')}
                 </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
