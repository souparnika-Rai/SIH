import sys
import re

with open('src/pages/CitizenApp.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_use_effect = """  useEffect(() => {
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
  }, [activeIssue]);"""

new_use_effect = """  useEffect(() => {
    let interval;
    const pollData = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem('my_reports') || '[]');
        const res = await fetch("http://127.0.0.1:8000/issues");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
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
    return () => clearInterval(interval);
  }, [activeIssue]);"""

content = content.replace(old_use_effect, new_use_effect)

content = re.sub(r'  const handleShowMyReports = async \(\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)

return_start = content.find('  return (\n    <div className="max-w-md mx-auto')
if return_start == -1:
    print('Could not find return statement')
    sys.exit(1)

before_return = content[:return_start]

new_return = """  return (
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
          <button onClick={() => setActiveIssue(null)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors">
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
                <span className="font-bold text-gray-700 uppercase" style={{ color: report.status === 'Completed' ? '#3b82f6' : report.status === 'Pending' ? '#ef4444' : '#eab308' }}>
                  {t(report.status.toLowerCase()) || report.status}
                </span>
                <span className="text-gray-400 font-medium">{report.date}</span>
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
      <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center p-6 overflow-y-auto relative">
        <div className="max-w-md w-full">
          
          {!activeIssue ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t('citizen_title')}</h1>
                <p className="text-gray-500 text-sm">{t('citizen_desc')}</p>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                {isCameraOpen ? (
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border shadow-sm bg-black flex flex-col">
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
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden border shadow-sm">
                    <img src={image} alt="Captured" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setImage(null); setRawFile(null); setLocation(null); setPlaceName(""); }} 
                      className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-gray-700 hover:text-red-500 backdrop-blur-sm transition-colors shadow-sm"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={startCamera} className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                      <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm text-gray-600 font-bold group-hover:text-blue-600">{t('use_camera')}</p>
                    </button>
                    
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                      <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm text-gray-600 font-bold group-hover:text-blue-600">{t('upload_file')}</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCapture} />
                    </label>
                  </div>
                )}

                {/* Contact Information Form */}
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Your Name (Optional)"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Contact Number (Optional)"
                      value={citizenContact}
                      onChange={(e) => setCitizenContact(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <div className={`p-2 rounded-full ${location ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{t('location')}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {placeName ? placeName : location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : t('waiting_for_gps')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={submitIssue}
                  disabled={!image || isSubmitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">{t('analyzing_ai') || 'Analyzing via AI...'}</span>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" /> {t('submit_report')}
                    </>
                  )}
                </button>
              </div>
            </>
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
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => updateStatus('Resolved')} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
                        <CheckCircle className="w-4 h-4" /> {t('accept')}
                      </button>
                      <button onClick={() => updateStatus('Declined')} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
                        <XCircle className="w-4 h-4" /> {t('decline')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Resolved / Declined States */}
                {activeIssue.status === 'Resolved' && (
                  <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 border border-green-200">
                    <CheckCircle className="w-5 h-5" /> {t('issue_closed_success') || 'Issue successfully closed.'}
                  </div>
                )}
                
                {activeIssue.status === 'Declined' && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl font-bold flex items-start gap-2 border border-red-200 text-sm">
                    <XCircle className="w-5 h-5 shrink-0 mt-0.5" /> {t('issue_rejected') || 'Issue rejected. Returning to assigned state.'}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
"""

with open('src/pages/CitizenApp.jsx', 'w', encoding='utf-8') as f:
    f.write(before_return + new_return)

print("Updated CitizenApp.jsx")
