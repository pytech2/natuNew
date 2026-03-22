import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTown } from '../context/TownContext';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Users, ArrowRight, Loader2, LogOut, ImagePlus, Upload, CheckCircle, Download, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function SelectTown() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { towns, selectTown, loading: townsLoading, refreshTowns } = useTown();
  const [townStats, setTownStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadTown, setUploadTown] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [oldPhotoStats, setOldPhotoStats] = useState(null);
  const [deletingPhotos, setDeletingPhotos] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    refreshTowns();
    fetchTownStats();
  }, [user]);

  const fetchTownStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const response = await axios.get(`${API_URL}/admin/towns/manage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stats = {};
      (response.data.towns || []).forEach(t => {
        stats[t.id] = { properties: t.property_count || 0, users: t.user_count || 0 };
      });
      setTownStats(stats);
    } catch (error) { console.error('Failed to fetch town stats:', error); }
    finally { setLoadingStats(false); }
  };

  const handleSelectTown = (town) => {
    setSelectedId(town.id);
    selectTown(town);
    setTimeout(() => {
      const destination = (user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'MC_OFFICER') ? '/admin' : '/employee';
      window.location.href = destination;
    }, 800);
  };

  const openUploadDialog = (e, town) => {
    e.stopPropagation();
    setUploadTown(town);
    setPhotoFile(null);
    setUploadResult(null);
    setOldPhotoStats(null);
    setUploadDialog(true);
    fetchOldPhotoStats(town.code);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !uploadTown) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      const res = await axios.post(`${API_URL}/admin/upload-old-photos`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data', 'X-Town-Code': uploadTown.code }
      });
      setUploadResult(res.data);
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const fetchOldPhotoStats = async (townCode) => {
    try {
      const res = await axios.get(`${API_URL}/admin/old-photos-stats`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Town-Code': townCode }
      });
      setOldPhotoStats(res.data);
    } catch { setOldPhotoStats(null); }
  };

  const handleDeleteOldPhotos = async () => {
    if (!uploadTown) return;
    if (!window.confirm('Are you sure? This will clear ALL old photo URLs from properties.')) return;
    setDeletingPhotos(true);
    try {
      const res = await axios.delete(`${API_URL}/admin/clear-old-photos`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Town-Code': uploadTown.code }
      });
      toast.success(res.data.message);
      setOldPhotoStats({ total_with_photos: 0 });
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete old photos'); }
    finally { setDeletingPhotos(false); }
  };

  const downloadOldPhotoSample = () => {
    const sampleData = [['Property ID', 'Photo URL'], ['3UYE8N55', 'https://example.com/photo1.jpg'], ['3UUOCQ65', 'https://example.com/photo2.jpg']];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'old_photos_sample.csv'; link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Sample file downloaded');
  };

  const accessibleTowns = user?.role === 'ADMIN' ? towns : towns.filter(t => !user?.assigned_town || t.id === user.assigned_town);

  const glassBg = { background: 'rgba(13, 17, 55, 0.7)', backdropFilter: 'blur(16px)' };
  const townColors = ['#00f5d4', '#f72585', '#7209b7', '#4cc9f0', '#ffd60a', '#06d6a0'];

  if (townsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0a0e27 0%, #0d1137 50%, #0a0e27 100%)'}}>
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0a0e27 0%, #0d1137 40%, #1a0a2e 70%, #0a0e27 100%)'}}>
      {/* Background orbs */}
      <div className="absolute top-[-15%] left-[10%] w-[400px] h-[400px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)', filter: 'blur(80px)'}} />
      <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-10" style={{background: 'radial-gradient(circle, #f72585 0%, transparent 70%)', filter: 'blur(80px)'}} />

      {/* Header */}
      <header className="relative z-10 border-b" style={{...glassBg, borderColor: 'rgba(0,245,212,0.15)'}}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-500/30" style={{background: 'rgba(0,245,212,0.1)', boxShadow: '0 0 15px rgba(0,245,212,0.15)'}}>
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm" style={{textShadow: '0 0 15px rgba(0,245,212,0.2)'}}>National Services Technical Unit</h1>
              <p className="text-cyan-300/50 text-xs">Property Tax Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-cyan-100 font-medium text-sm">{user?.name}</p>
              <p className="text-cyan-400/50 text-xs">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2" style={{textShadow: '0 0 30px rgba(0,245,212,0.15)'}}>Select Town</h2>
          <p className="text-cyan-300/50">Choose the town you want to work with</p>
        </div>

        {accessibleTowns.length === 0 ? (
          <div className="rounded-2xl border border-cyan-500/20 text-center py-12 px-6" style={glassBg}>
            <Building2 className="w-16 h-16 text-cyan-400/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Towns Available</h3>
            <p className="text-cyan-300/50 mb-4">
              {user?.role === 'ADMIN' ? 'Create your first town to get started' : 'Contact your administrator to get town access'}
            </p>
            {user?.role === 'ADMIN' && (
              <Button onClick={() => navigate('/admin/towns')} className="bg-cyan-600 hover:bg-cyan-700 border border-cyan-400/30">
                Create Town
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleTowns.map((town, idx) => {
              const stats = townStats[town.id] || { properties: 0, users: 0 };
              const isSelected = selectedId === town.id;
              const accentColor = townColors[idx % townColors.length];
              
              return (
                <div
                  key={town.id}
                  className={`rounded-2xl border cursor-pointer transition-all duration-300 ${
                    isSelected ? 'scale-105' : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    ...glassBg,
                    borderColor: isSelected ? accentColor : `${accentColor}33`,
                    boxShadow: isSelected ? `0 0 30px ${accentColor}30, 0 0 60px ${accentColor}10` : `0 0 15px ${accentColor}08`,
                  }}
                  onClick={() => handleSelectTown(town)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl border" style={{background: `${accentColor}15`, borderColor: `${accentColor}30`, boxShadow: `0 0 15px ${accentColor}15`}}>
                        <Building2 className="w-7 h-7" style={{color: accentColor, filter: `drop-shadow(0 0 6px ${accentColor}50)`}} />
                      </div>
                      <div className="flex items-center gap-2">
                        {user?.role === 'ADMIN' && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={(e) => openUploadDialog(e, town)}
                            className="h-8 px-2 text-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-300"
                            title="Upload Old Property Photos"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </Button>
                        )}
                        <span className="text-xs font-mono px-2 py-1 rounded-lg border border-cyan-500/20 text-cyan-300/60" style={{background: 'rgba(0,245,212,0.05)'}}>
                          {town.code}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-1" style={{textShadow: `0 0 15px ${accentColor}20`}}>
                      {town.name}
                    </h3>
                    
                    {town.description && (
                      <p className="text-sm text-cyan-300/40 mb-4">{town.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 pt-4" style={{borderTop: `1px solid ${accentColor}15`}}>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" style={{color: `${accentColor}80`}} />
                        <span className="text-sm text-cyan-200/70">
                          {loadingStats ? '...' : stats.properties} Properties
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" style={{color: `${accentColor}80`}} />
                        <span className="text-sm text-cyan-200/70">
                          {loadingStats ? '...' : stats.users} Users
                        </span>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-4 flex items-center justify-center gap-2 py-2 rounded-xl" style={{background: `${accentColor}15`}}>
                        <Loader2 className="w-4 h-4 animate-spin" style={{color: accentColor}} />
                        <span className="text-sm font-medium" style={{color: accentColor}}>Loading...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-cyan-400/30 text-sm">
            <ArrowRight className="w-4 h-4 inline mr-1" />
            Click on a town card to select and continue
          </p>
        </div>
      </main>

      {/* Upload Old Photos Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-md border-cyan-500/20" style={{background: '#0d1137', color: '#e0e0e0'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-100">
              <ImagePlus className="w-5 h-5 text-purple-400" />
              Upload Old Property Photos
            </DialogTitle>
            <DialogDescription className="text-cyan-300/50">
              Upload Excel file for <strong className="text-cyan-200">{uploadTown?.name}</strong> with Property ID and Photo URL columns
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {oldPhotoStats && (
              <div className="p-3 rounded-lg border border-purple-500/20 flex items-center justify-between" style={{background: 'rgba(114,9,183,0.1)'}}>
                <p className="text-sm text-purple-300">
                  <strong>{oldPhotoStats.total_with_photos || 0}</strong> properties with old photos
                </p>
                {(oldPhotoStats.total_with_photos || 0) > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDeleteOldPhotos} disabled={deletingPhotos}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-old-photos-btn">
                    {deletingPhotos ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Delete All
                  </Button>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg border border-cyan-500/15" style={{background: 'rgba(0,245,212,0.03)'}}>
              <p className="text-sm text-cyan-300/60 mb-2">Need the correct format?</p>
              <Button variant="outline" size="sm" onClick={downloadOldPhotoSample} className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                <Download className="w-4 h-4 mr-2" /> Download Sample Excel
              </Button>
              <p className="text-xs text-cyan-400/30 mt-2">Property ID in Column A, Photo URL in Column B</p>
            </div>

            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
              style={{borderColor: photoFile ? 'rgba(114,9,183,0.5)' : 'rgba(0,245,212,0.2)', background: photoFile ? 'rgba(114,9,183,0.05)' : 'transparent'}}
              onClick={() => photoInputRef.current?.click()}
            >
              <input ref={photoInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => setPhotoFile(e.target.files[0])} className="hidden" />
              {photoFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="font-medium text-cyan-100">{photoFile.name}</p>
                    <p className="text-sm text-cyan-300/40">{(photoFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-cyan-500/30 mb-2" />
                  <p className="text-cyan-200/60">Click to select Excel file</p>
                  <p className="text-xs text-cyan-400/30 mt-1">Format: Column A = Property ID, Column B = Photo URL</p>
                </div>
              )}
            </div>

            {uploadResult && (
              <div className="p-3 border border-purple-500/20 rounded-lg text-sm" style={{background: 'rgba(114,9,183,0.1)'}}>
                <p className="font-semibold text-purple-300">{uploadResult.message}</p>
                <div className="flex gap-4 mt-1 text-purple-400/70">
                  <span>Updated: {uploadResult.updated}</span>
                  <span>Not found: {uploadResult.not_found}</span>
                  <span>Skipped: {uploadResult.skipped}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} className="border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10">Cancel</Button>
            <Button onClick={handlePhotoUpload} disabled={!photoFile || uploading}
              className="border border-purple-400/30 text-white" style={{background: 'linear-gradient(135deg, #7209b7, #a855f7)'}}>
              {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>) : (<><Upload className="w-4 h-4 mr-2" /> Upload Photos</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
