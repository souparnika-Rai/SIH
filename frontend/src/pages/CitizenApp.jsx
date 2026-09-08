import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Upload, CheckCircle, XCircle, Info, User, Phone, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function CitizenApp() {
  const { t } = useTranslation();

  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [wardName, setWardName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [citizenName, setCitizenName] = useState("");
  const [citizenContact, setCitizenContact] = useState("");
  const [citizenNotes, setCitizenNotes] = useState("");
  
  const [uploadMode, setUploadMode] = useState('manual');
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  
  const [rawFile, setRawFile] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [toast, setToast] = useState(null);
  const [citizenRating, setCitizenRating] = useState(0);

  const [myReportsList, setMyReportsList] = useState([]);
  
  const videoRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleNewIssue = () => {
    setActiveIssue(null);
    setImage(null);
    setRawFile(null);
    setLocation(null);
    setPlaceName("");
    setWardName("");
    setCitizenNotes("");
  };

  const removeIssue = (id, e) => {
    if (e) e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem('my_reports') || '[]');
    const newSaved = saved.filter(i => i !== id);
    localStorage.setItem('my_reports', JSON.stringify(newSaved));
    setMyReportsList(prev => prev.filter(r => r.id !== id));
    if (activeIssue?.id === id) {
      setActiveIssue(null);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const fetchPlaceName = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setPlaceName(data.display_name);
        const addr = data.address || {};
        const ward = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.village || "";
        setWardName(ward);
      }
    } catch (e) {
      console.error("Geocoding error:", e);
    }
  };



  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const resetForm = handleNewIssue;

  const handleVerifyWorker = async (newStatus) => {
    if (!activeIssue) return;
    try {
      await fetch(`http://127.0.0.1:8000/issues/${activeIssue.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      setActiveIssue(prev => ({ ...prev, status: newStatus }));
      setToast('Verification submitted successfully!');
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to submit verification.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        setRawFile(file);
        setImage(URL.createObjectURL(blob));
        stopCamera();
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              fetchPlaceName(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => console.error(err)
          );
        }
      }, 'image/jpeg');
    }
  };

  useEffect(() => {
    let isActive = true;
    let interval;
    const pollData = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem('my_reports') || '[]');
        const res = await fetch("http://127.0.0.1:8000/issues");
        if (!res.ok || !isActive) return;
        const data = await res.json();
        if (Array.isArray(data) && isActive) {
          const filtered = data.filter(i => saved.includes(i.id));
          setMyReportsList(filtered);
          
          if (activeIssue) {
            const updated = data.find(i => i.id === activeIssue.id);
            if (updated) setActiveIssue(updated);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    pollData();
    interval = setInterval(pollData, 3000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [activeIssue]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          fetchPlaceName(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Please enable location services to tag this issue.");
          // Fallback to Sullia
          setLocation({ lat: 12.5566, lng: 75.3855 });
          fetchPlaceName(12.5566, 75.3855);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // Fallback to Sullia
      setLocation({ lat: 12.5566, lng: 75.3855 });
      fetchPlaceName(12.5566, 75.3855);
    }
  };

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setImage(URL.createObjectURL(file));
      getLocation();
    }
  };

  const retake = () => {
    setImage(null);
    setRawFile(null);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsVideoProcessing(true);
    const formData = new FormData();
    formData.append("video", file);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/process-video", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        setIsVideoProcessing(false);
        return;
      }
      
      if (data.image_url) {
          // Convert base64 to File object
          const res = await fetch(data.image_url);
          const blob = await res.blob();
          const file = new File([blob], "video_collage.jpg", { type: "image/jpeg" });
          
          setRawFile(file);
          setImage(data.image_url);
          getLocation(); // Try to get GPS
          setToast("Potholes detected successfully! Please review and submit.");
          setTimeout(() => setToast(null), 3000);
      }
      
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Failed to process video.");
    } finally {
      setIsVideoProcessing(false);
    }
  };
  
  const submitIssue = async () => {
    if (!location) {
      alert(t('location_required') || 'Location is required');
      return;
    }
    if (citizenContact && citizenContact.length < 10) {
      alert("Contact number must be exactly 10 digits");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("image", rawFile);
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("citizen_name", citizenName || "Anonymous");
    formData.append("citizen_contact", citizenContact || "N/A");
    formData.append("citizen_notes", citizenNotes || "");
    formData.append("place_name", placeName || "");
    
    if (uploadMode === 'auto') {
      formData.append("skip_analysis", "true");
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      const saved = JSON.parse(localStorage.getItem('my_reports') || '[]');
      if (!saved.includes(data.id)) {
        localStorage.setItem('my_reports', JSON.stringify([...saved, data.id]));
      }
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



  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden relative">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className="w-[340px] shrink-0 bg-white border-r flex flex-col shadow-xl z-20">
        <div className="p-5 border-b bg-white flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg tracking-tight">My Reports</h2>
            <p className="text-xs text-gray-500 mt-1">Track your submitted issues</p>
          </div>
          <button onClick={handleNewIssue} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors">
            + New
          </button>
        </div>
        
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {myReportsList.map(report => (
            <div 
              key={report.id} 
              onClick={() => setActiveIssue(report)}
              className={`p-3 bg-white border rounded-xl shadow-sm transition-all cursor-pointer ${activeIssue?.id === report.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : 'hover:border-blue-300 hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm text-gray-900">{t(report.type.toLowerCase().replace(' ', '_')) || report.type}</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold border">
                  #{report.id}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 truncate">{report.location}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 uppercase" style={{ color: report.status === 'Completed' ? '#3b82f6' : report.status === 'Pending' ? '#ef4444' : report.status === 'Resolved' ? '#10b981' : '#eab308' }}>
                    {t(report.status.toLowerCase()) || report.status}
                  </span>
                  <div className="flex gap-1 items-center">
                    <span className="text-gray-400 font-medium">{report.date}</span>
                    {report.status === 'Resolved' && (
                      <button onClick={(e) => removeIssue(report.id, e)} className="text-red-400 hover:text-red-600 p-0.5 rounded-full hover:bg-red-50 transition-colors" title="Remove Issue">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
            </div>
          ))}
          {myReportsList.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm italic">No reports submitted yet.</p>
              <p className="text-gray-400 text-xs mt-1">Reports you create will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Middle Column: Report Form */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          <div className="w-full max-w-[550px]">
            {!activeIssue ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                
                {/* Upload Mode Toggle */}
                <div className="flex p-1 bg-gray-100/80 rounded-2xl mb-8 shadow-inner relative">
                  <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out z-0 ${uploadMode === 'auto' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                  ></div>
                  <button 
                    onClick={() => setUploadMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold z-10 transition-colors ${uploadMode === 'manual' ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Manual Photo
                  </button>
                  <button 
                    onClick={() => setUploadMode('auto')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold z-10 transition-colors ${uploadMode === 'auto' ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Automated Video
                  </button>
                </div>

                {isCameraOpen ? (
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border shadow-sm bg-black flex flex-col mb-8">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 w-full flex justify-center gap-4">
                      <button onClick={stopCamera} className="bg-white/80 p-3 rounded-full text-gray-700 hover:bg-white backdrop-blur-sm shadow-lg font-bold px-6">
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button onClick={takePhoto} className="bg-blue-600 p-3 rounded-full text-white hover:bg-blue-700 shadow-lg font-bold px-6">
                        {t('take_photo') || 'Take Photo'}
                      </button>
                    </div>
                  </div>
                ) : image ? (
                  <div className="relative w-full rounded-2xl overflow-hidden border shadow-sm mb-8 group">
                    <img src={image} alt="Captured" className="w-full h-auto object-cover" />
                    <button onClick={retake} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold gap-2">
                      <Camera className="w-5 h-5" /> Retake
                    </button>
                  </div>
                ) : (
                  <div className="mb-8">
                    {uploadMode === 'manual' ? (
                      <div className="flex gap-4">
                        <button 
                          onClick={startCamera} 
                          className="flex-1 flex flex-col items-center justify-center h-32 border border-dashed border-gray-300 rounded-2xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-gray-600 group"
                        >
                          <Camera className="w-8 h-8 mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="font-semibold text-sm">Use Camera</span>
                        </button>
                        <label className="flex-1 flex flex-col items-center justify-center h-32 border border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-gray-600 group">
                          <Upload className="w-8 h-8 mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="font-semibold text-sm">Upload File</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleCapture} />
                        </label>
                      </div>
                    ) : isVideoProcessing ? (
                      <div className="flex flex-col items-center justify-center w-full h-32 border border-indigo-200 bg-indigo-50/50 rounded-2xl shadow-inner">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-sm font-bold text-indigo-700 animate-pulse">AI Model is analyzing video...</p>
                        <p className="text-xs text-indigo-500 mt-1">Scanning for defects and measuring severity</p>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-indigo-300 bg-indigo-50/30 rounded-2xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all group">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-sm text-indigo-800 font-bold">Upload Dashcam/Road Video</p>
                        <p className="text-xs text-indigo-500 mt-1">AI will auto-detect potholes and size</p>
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      </label>
                    )}
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm font-medium"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Phone className="h-5 w-5" />
                    </div>
                      <input
                        type="tel"
                        placeholder="Contact Number (10 digits)"
                        maxLength="10"
                        value={citizenContact}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 10) setCitizenContact(val);
                        }}
                        className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm font-medium"
                      />
                  </div>
                  <textarea
                    placeholder="Describe the problem clearly (Notes)"
                    value={citizenNotes}
                    onChange={(e) => setCitizenNotes(e.target.value)}
                    rows={3}
                    className="block w-full p-4 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm font-medium resize-none"
                  />
                </div>

                {/* Location Section */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 flex gap-4 items-start">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <MapPin className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Location (Drag pin to adjust)</h4>
                    {location ? (
                      <>
                        {wardName && <p className="text-sm font-bold text-blue-700 mb-0.5">Ward: {wardName}</p>}
                        <p className="text-sm text-gray-600 line-clamp-2">{placeName || "Location acquired"}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Waiting for GPS...</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={submitIssue}
                  disabled={!image || isSubmitting || !location}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-transparent text-lg font-bold rounded-2xl text-white bg-[#7ab0f5] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl shadow-sm border p-6 overflow-hidden relative"
                >
                  {/* Status Header */}
                  <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="bg-blue-100 p-2.5 rounded-full text-blue-600">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg">{t('report_status')}</h3>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t(activeIssue.status.toLowerCase()) || activeIssue.status}</p>
                    </div>
                  </div>
  
                  <div className="space-y-4 text-sm mb-6">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                      <span className="text-gray-500 font-semibold">{t('detected') || 'Detected'}</span>
                      <span className="font-extrabold text-gray-900">{t(activeIssue.type.toLowerCase().replace(' ', '_')) || activeIssue.type} ({activeIssue.confidence})</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                      <span className="text-gray-500 font-semibold">{t('priority')}</span>
                      <span className="font-extrabold text-red-600">{activeIssue.priority}/100</span>
                    </div>
                  </div>
  
                  {/* Tracking Images */}
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-2">Report Images</h4>
                    <div className="flex gap-2 w-full h-40">
                      <div className="flex-1 relative">
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">Before</span>
                        <img src={activeIssue.image} alt="Original" className="w-full h-full object-cover rounded-xl border shadow-sm" />
                      </div>
                      {activeIssue.worker_image && (
                        <div className="flex-1 relative">
                          <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">After</span>
                          <img src={activeIssue.worker_image} alt="Repaired" className="w-full h-full object-cover rounded-xl border shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If Worker Completed, show verification rating and accept/decline */}
                  {activeIssue.status === 'Completed' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t pt-6">
                      <h4 className="font-bold text-gray-900 mb-2">{t('worker_verification_title') || 'Verify Repair'}</h4>
                      <p className="text-xs text-gray-500 mb-4">{t('worker_verification_desc') || 'Please review the worker image and provide a rating.'}</p>
  
                      <div className="flex flex-col items-center my-4 bg-gray-50 p-4 rounded-xl border">
                        <p className="text-sm font-bold text-gray-700 mb-3">{t('rate_worker') || 'Rate the repair work'}</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setCitizenRating(star)}
                              className={`p-2 rounded-full transition-colors ${citizenRating >= star ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400'}`}
                            >
                              <Star className="w-8 h-8 fill-current" />
                            </button>
                          ))}
                        </div>
                        {citizenRating > 0 && (
                          <div className="w-full mt-4 flex gap-3">
                            <button onClick={() => handleVerifyWorker('Resolved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                              <CheckCircle className="w-5 h-5" /> Accept
                            </button>
                            <button onClick={() => handleVerifyWorker('In Progress')} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                              <XCircle className="w-5 h-5" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  {activeIssue.status !== 'Completed' && activeIssue.status !== 'Resolved' && (
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setActiveIssue(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-bold transition-colors">
                        Close
                      </button>
                      <button onClick={resetForm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors">
                        + New
                      </button>
                    </div>
                  )}

                  {activeIssue.status === 'Resolved' && (
                    <div className="mt-6 flex gap-3">
                      <button onClick={(e) => removeIssue(activeIssue.id, e)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                        <XCircle className="w-5 h-5" /> Remove from list
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Column: Info Panel */}
        <div className="w-[350px] lg:w-[400px] shrink-0 bg-blue-50/50 border-l hidden md:flex flex-col relative overflow-hidden p-8">
          <div className="relative z-10 space-y-8 mt-12">
            <h2 className="text-4xl font-extrabold text-[#1a365d] leading-tight">A smarter way to build better cities</h2>
            <p className="text-gray-600 text-lg">Your report helps authorities fix problems faster and create safer, cleaner and healthier communities.</p>
            
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <div className="text-blue-500 bg-blue-50 p-3 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Faster resolution<br/><span className="text-gray-500 font-normal">with AI analysis</span></p>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <div className="text-blue-500 bg-blue-50 p-3 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Track your report<br/><span className="text-gray-500 font-normal">in real-time</span></p>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <div className="text-blue-500 bg-blue-50 p-3 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Be a part of<br/><span className="text-gray-500 font-normal">positive change</span></p>
              </div>
            </div>
          </div>
          
          {/* Decorative City Illustration */}
          <div className="absolute bottom-0 left-0 right-0 h-64 opacity-50 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
          <div className="absolute bottom-0 left-0 right-0 z-0">
             <svg viewBox="0 0 1440 320" className="w-full h-auto text-blue-100 fill-current"><path d="M0,256L48,229.3C96,203,192,149,288,154.7C384,160,480,224,576,218.7C672,213,768,139,864,128C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

