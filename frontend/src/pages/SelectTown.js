import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTown } from '../context/TownContext';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Users, ArrowRight, Loader2, LogOut, ImagePlus, Upload, CheckCircle, Download, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
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
  
  // Old Photo Upload states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadTown, setUploadTown] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [oldPhotoStats, setOldPhotoStats] = useState(null);
  const [deletingPhotos, setDeletingPhotos] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
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
        stats[t.id] = { 
          properties: t.property_count || 0, 
          users: t.user_count || 0 
        };
      });
      setTownStats(stats);
    } catch (error) {
      console.error('Failed to fetch town stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSelectTown = (town) => {
    setSelectedId(town.id);
    selectTown(town);
    
    // Navigate based on role after short delay
    setTimeout(() => {
      const destination = (user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'MC_OFFICER') 
        ? '/admin' 
        : '/employee';
      window.location.href = destination;
    }, 800);
  };

  // Open upload dialog for a specific town
  const openUploadDialog = (e, town) => {
    e.stopPropagation(); // Prevent town selection
    setUploadTown(town);
    setPhotoFile(null);
    setUploadResult(null);
    setOldPhotoStats(null);
    setUploadDialog(true);
    fetchOldPhotoStats(town.code);
  };

  // Handle old photo upload
  const handlePhotoUpload = async () => {
    if (!photoFile || !uploadTown) return;
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      
      const res = await axios.post(`${API_URL}/admin/upload-old-photos`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data',
          'X-Town-Code': uploadTown.code
        }
      });
      
      setUploadResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Fetch old photo stats when dialog opens
  const fetchOldPhotoStats = async (townCode) => {
    try {
      const res = await axios.get(`${API_URL}/admin/old-photos-stats`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Town-Code': townCode }
      });
      setOldPhotoStats(res.data);
    } catch (err) { setOldPhotoStats(null); }
  };

  const handleDeleteOldPhotos = async () => {
    if (!uploadTown) return;
    if (!window.confirm('Are you sure? This will clear ALL old photo URLs from properties. This cannot be undone!')) return;
    setDeletingPhotos(true);
    try {
      const res = await axios.delete(`${API_URL}/admin/clear-old-photos`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Town-Code': uploadTown.code }
      });
      toast.success(res.data.message);
      setOldPhotoStats({ total_with_photos: 0 });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete old photos');
    } finally {
      setDeletingPhotos(false);
    }
  };

  const downloadOldPhotoSample = () => {
    const sampleData = [
      ['Property ID', 'Photo URL'],
      ['3UYE8N55', 'https://example.com/photo1.jpg'],
      ['3UUOCQ65', 'https://example.com/photo2.jpg'],
    ];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'old_photos_sample.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Sample file downloaded');
  };


  // Filter towns based on user access
  const accessibleTowns = user?.role === 'ADMIN' 
    ? towns 
    : towns.filter(t => !user?.assigned_town || t.id === user.assigned_town);

  if (townsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">National Services Technical Unit</h1>
              <p className="text-indigo-200 text-sm">Property Tax Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-indigo-200 text-xs">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Select Town</h2>
          <p className="text-indigo-200">Choose the town you want to work with</p>
        </div>

        {accessibleTowns.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Towns Available</h3>
              <p className="text-indigo-200 mb-4">
                {user?.role === 'ADMIN' 
                  ? 'Create your first town to get started'
                  : 'Contact your administrator to get town access'}
              </p>
              {user?.role === 'ADMIN' && (
                <Button 
                  onClick={() => navigate('/admin/towns')} 
                  className="bg-indigo-500 hover:bg-indigo-600"
                >
                  Create Town
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleTowns.map((town) => {
              const stats = townStats[town.id] || { properties: 0, users: 0 };
              const isSelected = selectedId === town.id;
              
              return (
                <Card 
                  key={town.id}
                  className={`
                    cursor-pointer transition-all duration-300 
                    ${isSelected 
                      ? 'bg-indigo-500 border-indigo-400 scale-105 shadow-xl shadow-indigo-500/30' 
                      : 'bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 hover:scale-102'
                    }
                  `}
                  onClick={() => handleSelectTown(town)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-indigo-500/20'}`}>
                        <Building2 className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {user?.role === 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => openUploadDialog(e, town)}
                            className={`h-8 px-2 ${isSelected ? 'text-white hover:bg-white/20' : 'text-indigo-300 hover:bg-white/10 hover:text-white'}`}
                            title="Upload Old Property Photos"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </Button>
                        )}
                        <span className={`text-sm font-mono px-2 py-1 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-indigo-300'
                        }`}>
                          {town.code}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className={`text-xl font-bold mb-2 ${isSelected ? 'text-white' : 'text-white'}`}>
                      {town.name}
                    </h3>
                    
                    {town.description && (
                      <p className={`text-sm mb-4 ${isSelected ? 'text-indigo-100' : 'text-indigo-200'}`}>
                        {town.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-1">
                        <MapPin className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`} />
                        <span className={`text-sm ${isSelected ? 'text-white' : 'text-indigo-200'}`}>
                          {loadingStats ? '...' : stats.properties} Properties
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`} />
                        <span className={`text-sm ${isSelected ? 'text-white' : 'text-indigo-200'}`}>
                          {loadingStats ? '...' : stats.users} Users
                        </span>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-white">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-10 text-center">
          <p className="text-indigo-300 text-sm">
            <ArrowRight className="w-4 h-4 inline mr-1" />
            Click on a town card to select and continue
          </p>
        </div>
      </main>

      {/* Upload Old Photos Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-purple-600" />
              Upload Old Property Photos
            </DialogTitle>
            <DialogDescription>
              Upload Excel file for <strong>{uploadTown?.name}</strong> with Property ID and Photo URL columns
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current Stats */}
            {oldPhotoStats && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                <p className="text-sm text-purple-700">
                  <strong>{oldPhotoStats.total_with_photos || 0}</strong> properties with old photos
                </p>
                {(oldPhotoStats.total_with_photos || 0) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteOldPhotos}
                    disabled={deletingPhotos}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    data-testid="delete-old-photos-btn"
                  >
                    {deletingPhotos ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 mr-1" />
                    )}
                    Delete All
                  </Button>
                )}
              </div>
            )}

            {/* Download Sample */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Need the correct format?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadOldPhotoSample}
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sample Excel
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                Property ID in Column A, Photo URL in Column B
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                photoFile ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
              }`}
              onClick={() => photoInputRef.current?.click()}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="hidden"
              />
              {photoFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">{photoFile.name}</p>
                    <p className="text-sm text-gray-500">{(photoFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Click to select Excel file</p>
                  <p className="text-xs text-gray-400 mt-1">Format: Column A = Property ID, Column B = Photo URL</p>
                </div>
              )}
            </div>

            {uploadResult && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                <p className="font-semibold text-purple-800">{uploadResult.message}</p>
                <div className="flex gap-4 mt-1 text-purple-600">
                  <span>✓ Updated: {uploadResult.updated}</span>
                  <span>✗ Not found: {uploadResult.not_found}</span>
                  <span>⊘ Skipped: {uploadResult.skipped}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePhotoUpload}
              disabled={!photoFile || uploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
