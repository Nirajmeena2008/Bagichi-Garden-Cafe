import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  ExternalLink, 
  Edit3, 
  AlertCircle,
  Compass,
  RefreshCw
} from 'lucide-react';
import { getCurrentCustomerLocation, CustomerLocationData } from '../lib/locationService';

interface LocationAssistantProps {
  onLocationSelected: (data: {
    address: string;
    coordinates?: { lat: number; lng: number };
    mapsLink?: string;
    landmark?: string;
    houseDetails?: string;
  }) => void;
  initialAddress?: string;
  initialLandmark?: string;
  initialHouseDetails?: string;
}

export default function LocationAssistant({
  onLocationSelected,
  initialAddress = '',
  initialLandmark = '',
  initialHouseDetails = ''
}: LocationAssistantProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationResult, setLocationResult] = useState<CustomerLocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Editable address fields (Manual option always accessible)
  const [address, setAddress] = useState(initialAddress);
  const [houseDetails, setHouseDetails] = useState(initialHouseDetails);
  const [landmark, setLandmark] = useState(initialLandmark);
  const [showManualInputs, setShowManualInputs] = useState(true);

  const handleFetchLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const loc = await getCurrentCustomerLocation();
      setLocationResult(loc);
      
      const newAddress = loc.formattedAddress || `${loc.street ? loc.street + ', ' : ''}${loc.locality ? loc.locality + ', ' : ''}${loc.city}, Rajasthan`;
      setAddress(newAddress);
      
      onLocationSelected({
        address: newAddress,
        coordinates: { lat: loc.latitude, lng: loc.longitude },
        mapsLink: loc.googleMapsUrl,
        landmark,
        houseDetails
      });
    } catch (err: any) {
      console.warn('[LocationAssistant] Auto-fetch error:', err);
      setLocationError(err.message || 'Could not fetch your location automatically. Please enter your address manually.');
      setShowManualInputs(true);
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    onLocationSelected({
      address: val,
      coordinates: locationResult ? { lat: locationResult.latitude, lng: locationResult.longitude } : undefined,
      mapsLink: locationResult?.googleMapsUrl,
      landmark,
      houseDetails
    });
  };

  const handleHouseDetailsChange = (val: string) => {
    setHouseDetails(val);
    onLocationSelected({
      address,
      coordinates: locationResult ? { lat: locationResult.latitude, lng: locationResult.longitude } : undefined,
      mapsLink: locationResult?.googleMapsUrl,
      landmark,
      houseDetails: val
    });
  };

  const handleLandmarkChange = (val: string) => {
    setLandmark(val);
    onLocationSelected({
      address,
      coordinates: locationResult ? { lat: locationResult.latitude, lng: locationResult.longitude } : undefined,
      mapsLink: locationResult?.googleMapsUrl,
      landmark: val,
      houseDetails
    });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-[#14100d] border border-white/10 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#e8a33d]/15 flex items-center justify-center text-[#e8a33d]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Delivery Location
              <span className="text-[11px] font-normal text-white/40">(Optional)</span>
            </h4>
            <p className="text-xs text-white/50">Auto-fetch via Google Maps or enter manually</p>
          </div>
        </div>

        {locationResult && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Location Fetched
          </span>
        )}
      </div>

      {/* Primary Auto-Fetch Button */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={handleFetchLocation}
          disabled={isLocating}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#d48e28] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer shadow-lg shadow-[#e8a33d]/20"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Detecting GPS Location via Google Maps...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-black text-black" />
              <span>Auto-Fetch My Location (Google Maps)</span>
            </>
          )}
        </button>

        {locationResult && (
          <button
            type="button"
            onClick={handleFetchLocation}
            title="Refresh Location"
            className="px-3.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all flex items-center justify-center text-xs font-medium"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Message if GPS is denied */}
      {locationError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Location Note</p>
            <p className="text-amber-200/80">{locationError}</p>
          </div>
        </div>
      )}

      {/* Location Card if successfully fetched */}
      {locationResult && (
        <div className="p-3.5 rounded-xl bg-black/40 border border-[#e8a33d]/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="flex items-center gap-1.5 text-[#e8a33d] font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              Coordinates: {locationResult.latitude.toFixed(5)}, {locationResult.longitude.toFixed(5)}
            </span>
            <a 
              href={locationResult.googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#e8a33d] hover:underline"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-white font-medium bg-white/5 p-2.5 rounded-lg border border-white/5">
            {locationResult.formattedAddress}
          </p>
        </div>
      )}

      {/* Manual Address Fields Section */}
      <div className="pt-2 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
            <Edit3 className="w-3 h-3 text-[#e8a33d]" />
            Delivery Address & Details (Editable)
          </label>
          <button
            type="button"
            onClick={() => setShowManualInputs(!showManualInputs)}
            className="text-[11px] text-[#e8a33d] hover:underline"
          >
            {showManualInputs ? "Hide extra fields" : "Show extra address fields"}
          </button>
        </div>

        {/* Street / Area Address */}
        <div>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="House/Building name, Street, Colony, Landmark or Area in Jaipur..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#e8a33d] transition-all resize-none"
          />
        </div>

        {/* Optional Extra Fields */}
        {showManualInputs && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">
                Flat / House / Floor No. <span className="text-white/30">(Optional)</span>
              </label>
              <input
                type="text"
                value={houseDetails}
                onChange={(e) => handleHouseDetailsChange(e.target.value)}
                placeholder="e.g. Flat 301, Tower B"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#e8a33d]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-white/50 mb-1">
                Nearby Landmark <span className="text-white/30">(Optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => handleLandmarkChange(e.target.value)}
                placeholder="e.g. Near Akshardham Temple"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#e8a33d]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
