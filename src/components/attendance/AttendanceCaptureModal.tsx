'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Camera,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Navigation,
  ShieldAlert,
  SwitchCamera,
  Users,
  Sparkles,
  ExternalLink,
  UserX,
} from 'lucide-react';
import { getCurrentBrowserLocation, calculateHaversineDistance, GeoLocationResult } from '@/lib/geo';

interface OfficeSetting {
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStartTime?: string;
  toleranceMinutes?: number;
  workEndTime?: string;
}

interface AttendanceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resultData: any) => void;
  mode: 'check-in' | 'check-out';
  officeSetting: OfficeSetting;
  currentUser?: any;
}

export const AttendanceCaptureModal: React.FC<AttendanceCaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  officeSetting,
  currentUser,
}) => {
  // Step: 'detecting-location' | 'out-of-range' | 'camera-active' | 'photo-preview' | 'submitting'
  const [step, setStep] = useState<
    'detecting-location' | 'out-of-range' | 'camera-active' | 'photo-preview' | 'submitting'
  >('detecting-location');

  // Location state
  const [location, setLocation] = useState<GeoLocationResult | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Camera & Photo state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Authenticated user & Employee linking state
  const [userProfile, setUserProfile] = useState<any>(currentUser || null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [autoLinkMessage, setAutoLinkMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setUserProfile(currentUser);
    } else if (isOpen) {
      fetch('/api/auth/me', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const u = data?.user || data?.data || data;
          if (u) setUserProfile(u);
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser]);

  const hasEmployeeProfile = Boolean(userProfile?.employee?.id || userProfile?.employee);
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'HR';

  const handleAutoLinkProfile = async () => {
    try {
      setIsAutoLinking(true);
      setAutoLinkMessage(null);
      setApiError(null);
      const res = await fetch('/api/employees/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoProvision: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghubungkan profil karyawan.');
      }
      setAutoLinkMessage(data.message || 'Profil karyawan berhasil dihubungkan!');
      if (data.employee) {
        setUserProfile((prev: any) => ({
          ...prev,
          employee: data.employee,
        }));
      }
    } catch (err: any) {
      setApiError(err.message || 'Gagal menghubungkan profil');
    } finally {
      setIsAutoLinking(false);
    }
  };

  // Reset & Start Geolocation when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('detecting-location');
      setLocation(null);
      setDistance(null);
      setLocationError(null);
      setCameraError(null);
      setCapturedPhoto(null);
      setApiError(null);
      detectLocation();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // 1. Detect & Validate Location
  const detectLocation = async (simulateAtOffice: boolean = false) => {
    setStep('detecting-location');
    setLocationError(null);

    try {
      let coords: GeoLocationResult;

      if (simulateAtOffice) {
        // Fallback or dev test button to simulate position at office
        coords = {
          latitude: officeSetting.latitude,
          longitude: officeSetting.longitude,
          accuracy: 10,
          timestamp: Date.now(),
        };
      } else {
        coords = await getCurrentBrowserLocation();
      }

      setLocation(coords);

      const calculatedDistance = calculateHaversineDistance(
        coords.latitude,
        coords.longitude,
        officeSetting.latitude,
        officeSetting.longitude
      );
      setDistance(calculatedDistance);

      console.info('📍 [GPS Geofence Audit]:', {
        employeeGPS: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
        },
        officeCoordinates: {
          locationName: officeSetting.locationName,
          latitude: officeSetting.latitude,
          longitude: officeSetting.longitude,
        },
        allowedRadiusMeters: officeSetting.radiusMeters,
        actualDistanceMeters: calculatedDistance,
        isWithinArea: calculatedDistance <= officeSetting.radiusMeters,
      });

      if (calculatedDistance <= officeSetting.radiusMeters) {
        // Valid distance -> proceed to camera
        setStep('camera-active');
        startCamera(facingMode);
      } else {
        // Outside allowed radius
        setStep('out-of-range');
      }
    } catch (err: any) {
      console.error('Geolocation error:', err);
      setLocationError(err.message || 'Lokasi diperlukan untuk melakukan absensi.');
    }
  };

  // 2. Start Camera
  const startCamera = async (modeToUse: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: modeToUse,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      // Fallback without exact facingMode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr) {
        setCameraError('Akses kamera diperlukan untuk mengambil foto absensi. Pastikan kamera diizinkan pada browser.');
      }
    }
  };

  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Attach video stream if re-rendering camera step
  useEffect(() => {
    if (step === 'camera-active' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  // 3. Capture Selfie Frame
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;

      const context = canvas.getContext('2d');
      if (context) {
        if (facingMode === 'user') {
          // Mirror the image horizontally for natural selfie appearance
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        setStep('photo-preview');
        stopCamera();
      }
    } catch (err) {
      console.error('Error capturing selfie:', err);
      setCameraError('Foto gagal diambil. Silakan coba lagi.');
    }
  };

  // 4. Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    setStep('camera-active');
    startCamera(facingMode);
  };

  // 5. Submit Attendance
  const handleUsePhotoAndSubmit = async () => {
    if (!capturedPhoto || !location) return;

    setIsSubmitting(true);
    setApiError(null);

    const endpoint =
      mode === 'check-in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
    const method = mode === 'check-in' ? 'POST' : 'PATCH';

    try {
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        photo: capturedPhoto,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Absensi gagal disimpan. Silakan coba lagi.');
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Submit attendance error:', err);
      setApiError(err.message || 'Absensi gagal disimpan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={mode === 'check-in' ? 'Absen Masuk' : 'Absen Pulang'}
      description="Validasi lokasi GPS dan verifikasi foto selfie karyawan"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Hidden canvas used for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* STEP 1: Detecting Location */}
        {step === 'detecting-location' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-pulse">
              <Navigation className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                Memvalidasi Lokasi Perangkat...
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Sistem sedang meminta koordinat GPS untuk memastikan Anda berada di dalam radius{' '}
                <strong>{officeSetting.radiusMeters} meter</strong> dari {officeSetting.locationName}.
              </p>
            </div>

            {locationError && (
              <div className="w-full p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 text-left">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{locationError}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => detectLocation(false)}>
                      Coba Lagi
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => detectLocation(true)}
                      className="text-xs"
                      title="Simulasi lokasi kantor untuk testing"
                    >
                      Gunakan Lokasi Kantor (Demo)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Out of Range / Rejected */}
        {step === 'out-of-range' && (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-rose-600">
                Anda berada di luar area absensi
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Absensi ditolak karena perangkat Anda berada di luar radius lokasi kerja yang diizinkan.
              </p>
            </div>

            {/* Distance Comparison Card with Audit Info */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Lokasi Kerja:</span>
                <span className="font-semibold text-slate-800">
                  {officeSetting.locationName} ({officeSetting.latitude.toFixed(4)}, {officeSetting.longitude.toFixed(4)})
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">GPS Terdeteksi:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} (±${Math.round(location.accuracy)}m)` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Jarak Aktual:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {distance !== null ? `${distance} meter` : '—'} dari kantor
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Batas Radius:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {officeSetting.radiusMeters} meter
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Status Area:</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                  DI LUAR AREA
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full pt-2">
              <Button variant="outline" size="md" onClick={() => detectLocation(false)} className="flex-1 gap-1">
                <RefreshCw className="h-4 w-4" />
                Perbarui GPS
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => detectLocation(true)}
                className="flex-1 text-xs"
                title="Simulasi lokasi kantor untuk testing"
              >
                Gunakan Lokasi Kantor (Demo)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Camera Live Viewfinder */}
        {step === 'camera-active' && (
          <div className="space-y-4">
            {/* Valid location info pill & Camera Flip Button */}
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Lokasi dalam area ({distance ?? 0}m dari kantor)</span>
              </div>
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-emerald-700 font-semibold text-[11px] shadow-2xs hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
                title="Ganti kamera depan / belakang"
              >
                <SwitchCamera className="h-3.5 w-3.5" />
                <span>{facingMode === 'user' ? 'Depan' : 'Belakang'}</span>
              </button>
            </div>

            {/* Viewfinder Frame */}
            <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-2xl overflow-hidden bg-slate-900 border-2 border-blue-500 shadow-md flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'transform -scale-x-100' : ''
                }`}
              />

              {/* Viewfinder Circle Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 rounded-full border-2 border-dashed border-white/70 shadow-lg" />
              </div>

              {/* Overlay Guidance */}
              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <span className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-3 py-1 rounded-full">
                  Posisikan wajah Anda di dalam lingkaran
                </span>
              </div>
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Shutter Button */}
            <div className="flex justify-center pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={captureSelfie}
                disabled={!!cameraError}
                className="w-full max-w-[280px] gap-2 py-3 font-bold shadow-md bg-blue-600 hover:bg-blue-700 active:scale-98 transition-transform"
              >
                <Camera className="h-5 w-5" />
                AMBIL FOTO SELFIE
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Photo Preview & Confirmation */}
        {step === 'photo-preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <span className="font-semibold">Pratinjau Foto Selfie Absensi</span>
              <span className="text-[11px] text-blue-600 font-mono">Jarak: {distance ?? 0}m</span>
            </div>

            {/* Preview Image */}
            <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-300 shadow-sm">
              {capturedPhoto && (
                <img
                  src={capturedPhoto}
                  alt="Selfie Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Unlinked Employee Warning Banner */}
            {!hasEmployeeProfile && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <UserX className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-800">
                      Akun Belum Terhubung ke Profil Karyawan
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Akun Anda ({userProfile?.email || 'saat ini'}) belum terhubung dengan data karyawan di sistem. Tombol absensi dinonaktifkan sampai akun dipasangkan.
                    </p>
                  </div>
                </div>

                {isAdmin ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAutoLinkProfile}
                      isLoading={isAutoLinking}
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Hubungkan Profil Otomatis
                    </Button>
                    <Link
                      href="/employees"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      <Users className="h-3.5 w-3.5 text-amber-600" />
                      Buka Manajemen Karyawan
                      <ExternalLink className="h-3 w-3 text-amber-500 ml-0.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="p-2 bg-white/70 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                    Silakan hubungi tim HR atau Administrator untuk menghubungkan akun login Anda ke profil karyawan.
                  </div>
                )}
              </div>
            )}

            {autoLinkMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{autoLinkMessage}</span>
              </div>
            )}

            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Dual Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="gap-2 font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                ULANGI FOTO
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleUsePhotoAndSubmit}
                isLoading={isSubmitting}
                disabled={isSubmitting || !hasEmployeeProfile}
                title={!hasEmployeeProfile ? 'Akun belum terhubung ke profil karyawan' : undefined}
                className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600 shadow-sm active:scale-98 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-4 w-4" />
                GUNAKAN FOTO
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
