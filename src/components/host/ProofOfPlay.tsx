import React, { useState, useEffect } from 'react';
import { FileText, Upload, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MediaService } from '../../services/mediaService';
import ProofOfPlayWidget from '../shared/ProofOfPlayWidget';
import AssetProofOfPlayWidget from '../shared/AssetProofOfPlayWidget';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export default function HostProofOfPlay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userAssets, setUserAssets] = useState<Array<{id: string; file_name: string; file_type: string}>>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserAssets = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const assets = await MediaService.getUserMedia(user.id);
        setUserAssets(assets.map(asset => ({
          id: asset.id,
          file_name: asset.file_name,
          file_type: asset.file_type
        })));
      } catch (error) {
        console.error('Error loading user assets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAssets();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Proof-of-Play</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">View play records for ads shown on your kiosks, tied to your uploaded assets.</p>
      </div>

      {/* Overall PoP Summary */}
      <ProofOfPlayWidget
        accountId={user?.id}
        title="Overall Play Activity"
        showTable={true}
        showExport={true}
        maxRecords={20}
        dateRange={{
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }}
      />

      {/* Asset Selection */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Upload className="h-10 w-10 text-blue-600" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Asset-Specific Analysis</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Select an asset to view detailed proof-of-play information tied to that specific upload.
            </p>
            
            {loading ? (
              <div className="mt-4">
                <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
              </div>
            ) : userAssets.length > 0 ? (
              <div className="mt-4">
                <select
                  value={selectedAsset || ''}
                  onChange={(e) => setSelectedAsset(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an asset to analyze...</option>
                  {userAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.file_name} ({asset.file_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-gray-500 text-sm">No assets uploaded yet.</p>
                <Button 
                  onClick={() => navigate('/host/ads/upload')}
                  className="mt-2"
                >
                  Upload Your First Asset
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Asset-Specific PoP Information */}
      {selectedAsset && (
        <AssetProofOfPlayWidget
          assetId={selectedAsset}
          title="Asset Play Activity"
          showTable={true}
          showExport={true}
          maxRecords={15}
          filters={{
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }}
        />
      )}

      {/* Client Reports Link */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <FileText className="h-10 w-10 text-blue-600" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Advanced Client Reports</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              For detailed filtering, CSV export, and campaign-level analytics, open the client reports section.
            </p>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => navigate('/client/proof-of-play')}>
                <Eye className="h-4 w-4 mr-2" />
                Open Client Reports
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


