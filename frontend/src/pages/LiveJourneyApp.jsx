import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Camera, MapPin, Bus, Play, Square, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveJourneyApp() {
  const [isLive, setIsLive] = useState(false);
  const [location, setLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [potholes, setPotholes] = useState([]);
  const [recentCaptures, setRecentCaptures] = useState([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastReportTimeRef = useRef(0);

  // Default to Bangalore
  const defaultLocation = { lat: 12.9716, lng: 77.5946 };

  useEffect(() => {
    // Initial location grab
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(defaultLocation)
      );
    } else {
      setLocation(defaultLocation);
    }
    return () => stopJourney();
  }, []);

  const startJourney = async () => {
    setRoute([]);
    setPotholes([]);
    setIsLive(true);
    setIsSummaryModalOpen(false);

    // Start Video
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert("Could not access camera");
      setIsLive(false);
      return;
    }

    // Start GPS Tracking
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setRoute(prev => [...prev, [loc.lng, loc.lat]]); // maplibre uses [lng, lat] for lines
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }

    // Start Frame Processing (1 FPS)
    intervalRef.current = setInterval(processFrame, 1000);
  };

  const stopJourney = () => {
    setIsLive(false);
    setIsSummaryModalOpen(true);
    
    // Stop GPS
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Stop Video
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Stop Processing
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !location) return;

    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    // Throttle reports to avoid spamming the same pothole (wait 3 seconds)
    const now = Date.now();
    if (now - lastReportTimeRef.current < 3000) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get unannotated blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    try {
      // 1. Detect
      const detectRes = await fetch("http://127.0.0.1:8000/detect-frame", {
        method: "POST",
        body: formData
      });
      const detectData = await detectRes.json();

      if (detectData.boxes && detectData.boxes.length > 0) {
        lastReportTimeRef.current = Date.now();
        
        // Draw boxes on canvas
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        
        detectData.boxes.forEach(box => {
          ctx.strokeRect(box.x, box.y, box.w, box.h);
          
          // Calculate size
          const frame_w = canvas.width || 1;
          const scale_cm_per_px = 300.0 / Math.max(frame_w, 1);
          const w_cm = Math.round(box.w * scale_cm_per_px);
          const h_cm = Math.round(box.h * scale_cm_per_px);
          
          ctx.fillStyle = "red";
          ctx.font = "bold 22px Arial";
          ctx.fillText(`Pothole: ${w_cm}cm x ${h_cm}cm`, box.x, box.y - 10);
        });

        // Stamp exact GPS location on the image for the Admin
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(10, canvas.height - 40, canvas.width - 20, 30);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText(`GPS Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`, 20, canvas.height - 20);

        // Add to map
        const potholeLoc = { lat: location.lat, lng: location.lng, id: Date.now() };
        setPotholes(prev => [...prev, potholeLoc]);

        // Get annotated blob
        const annotatedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        
        // Temporarily store the image for the UI preview
        const previewUrl = URL.createObjectURL(annotatedBlob);
        setRecentCaptures(prev => [previewUrl, ...prev].slice(0, 3)); // Keep last 3
        
        // 2. Submit to backend
        const submitData = new FormData();
        submitData.append("image", annotatedBlob, "annotated_pothole.jpg");
        submitData.append("latitude", potholeLoc.lat.toString());
        submitData.append("longitude", potholeLoc.lng.toString());
        submitData.append("citizen_name", "Live Journey Tracker");
        submitData.append("skip_analysis", "true"); // Bypass gemini
        
        await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          body: submitData
        });
      }
    } catch (err) {
      console.error("Error processing frame:", err);
    }
  };

  const routeGeoJSON = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100">
      <div className="bg-indigo-600 text-white px-6 py-4 shadow-md flex justify-between items-center z-10 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bus className="w-6 h-6" /> Live Journey Tracker
          </h1>
          <p className="text-indigo-100 text-sm hidden md:block">Automatically detect and report potholes while driving.</p>
        </div>
        <div>
          {!isLive ? (
            <button 
              onClick={startJourney}
              className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-6 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" /> Start Journey
            </button>
          ) : (
            <button 
              onClick={stopJourney}
              className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-6 rounded-full shadow-lg flex items-center gap-2 transition-all animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" /> Stop Journey
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Camera Feed */}
        <div className="w-full h-1/2 md:h-full md:w-1/3 bg-black flex flex-col relative border-b-4 md:border-b-0 md:border-r-4 border-indigo-900 flex-shrink-0">
          <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-gray-500'}`}></div>
            {isLive ? 'LIVE CAPTURE' : 'CAMERA OFF'}
          </div>
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${!isLive && 'opacity-30'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Recent Captures Overlay */}
          {recentCaptures.length > 0 && (
            <div className="absolute top-16 left-4 flex flex-col gap-2 z-10">
              {recentCaptures.map((url, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
                  key={idx} 
                  className="w-24 h-24 rounded-lg overflow-hidden border-2 border-green-400 shadow-lg relative"
                >
                  <img src={url} className="w-full h-full object-cover" alt="Captured Pothole" />
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-1 rounded-bl">Sent ✓</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Overlay Stats */}
          {isLive && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center border border-white/10">
              <div className="text-white">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reports</p>
                <p className="text-3xl font-black text-red-400">{potholes.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Speed</p>
                <p className="text-xl font-bold text-white">~ {route.length > 2 ? '35 km/h' : '0 km/h'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map */}
        <div className="w-full h-1/2 md:h-full md:w-2/3 relative bg-gray-200 flex-grow">
          {location && (
            <Map
              initialViewState={{
                longitude: location.lng,
                latitude: location.lat,
                zoom: 14
              }}
              mapStyle={{
                version: 8,
                sources: {
                  osm: {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap'
                  }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
              }}
            >
              {/* Draw Route Line */}
              {route.length > 1 && (
                <Source id="route" type="geojson" data={routeGeoJSON}>
                  <Layer
                    id="route-line"
                    type="line"
                    paint={{
                      'line-color': '#4f46e5',
                      'line-width': 6,
                      'line-opacity': 0.8
                    }}
                  />
                </Source>
              )}

              {/* Current Bus Position */}
              <Marker longitude={location.lng} latitude={location.lat}>
                <div className="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white animate-bounce">
                  <Bus className="w-6 h-6 text-white" />
                </div>
              </Marker>

              {/* Pothole Red Dots */}
              {potholes.map((p, idx) => (
                <Marker key={idx} longitude={p.lng} latitude={p.lat}>
                  <div className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white shadow-sm"></span>
                  </div>
                </Marker>
              ))}
            </Map>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      <AnimatePresence>
        {isSummaryModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Journey Ended</h2>
              <p className="text-gray-500 mb-6">Your automated dashcam successfully analyzed the route.</p>
              
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8">
                <p className="text-5xl font-black text-red-600 mb-1">{potholes.length}</p>
                <p className="text-sm font-bold text-red-800 uppercase tracking-wide">Potholes Reported</p>
              </div>

              <button 
                onClick={() => setIsSummaryModalOpen(false)}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
              >
                Close Summary
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
