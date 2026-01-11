// backend/src/modules/location/location.services.ts
import { IPGeolocationService, IPLocationResult } from './ipGeolocation.service';
import { prisma } from "../../shared/prisma";
import https from "https";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";

interface LocationData {
  latitude: number;
  longitude: number;
  locationName?: string;
  city?: string;
  country?: string;
  timezone?: string;
  ip?: string;
  source?: string;
}

interface UserLocation {
  id: string;
  name: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  locationUpdatedAt: Date | null;
  profileImage: string | null;
  locationSource?: string;
  enableLiveLocation: boolean;
}

// Enhanced IP location detection
const getLocationFromIP = async (ip: string): Promise<LocationData> => {
  console.log(`🔍 Getting location from IP: ${ip}`);
  
  try {
    const result = await IPGeolocationService.getLocationFromIP(ip);
    console.log(`📍 IP Location Result: ${result.city}, ${result.country} (Source: ${result.source})`);
    console.log(`📊 Coordinates: ${result.latitude}, ${result.longitude}`);
    
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city,
      country: result.country,
      timezone: result.timezone,
      locationName: `${result.city}, ${result.country}`,
      ip,
      source: result.source
    };
  } catch (error) {
    console.error("❌ IP location failed:", error);
    console.log(`🔄 Falling back to global location for IP: ${ip}`);
    return getGlobalFallback(ip);
  }
};

// Global fallback - no Bangladesh bias
const getGlobalFallback = (ip?: string): LocationData => {
  const globalCities = [
    { name: "New York, USA", lat: 40.7128, lon: -74.0060, city: "New York", country: "USA", timezone: "America/New_York" },
    { name: "London, UK", lat: 51.5074, lon: -0.1278, city: "London", country: "UK", timezone: "Europe/London" },
    { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
    { name: "Singapore", lat: 1.3521, lon: 103.8198, city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
    { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
    { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708, city: "Dubai", country: "UAE", timezone: "Asia/Dubai" },
    { name: "Berlin, Germany", lat: 52.5200, lon: 13.4050, city: "Berlin", country: "Germany", timezone: "Europe/Berlin" },
    { name: "Paris, France", lat: 48.8566, lon: 2.3522, city: "Paris", country: "France", timezone: "Europe/Paris" },
    { name: "Delhi, India", lat: 28.6139, lon: 77.2090, city: "Delhi", country: "India", timezone: "Asia/Kolkata" },
    { name: "São Paulo, Brazil", lat: -23.5505, lon: -46.6333, city: "São Paulo", country: "Brazil", timezone: "America/Sao_Paulo" },
    { name: "Cairo, Egypt", lat: 30.0444, lon: 31.2357, city: "Cairo", country: "Egypt", timezone: "Africa/Cairo" },
    { name: "Johannesburg, South Africa", lat: -26.2041, lon: 28.0473, city: "Johannesburg", country: "South Africa", timezone: "Africa/Johannesburg" },
    { name: "Moscow, Russia", lat: 55.7558, lon: 37.6176, city: "Moscow", country: "Russia", timezone: "Europe/Moscow" },
    { name: "Beijing, China", lat: 39.9042, lon: 116.4074, city: "Beijing", country: "China", timezone: "Asia/Shanghai" },
    { name: "Seoul, South Korea", lat: 37.5665, lon: 126.9780, city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
    { name: "Bangkok, Thailand", lat: 13.7563, lon: 100.5018, city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
    { name: "Mexico City, Mexico", lat: 19.4326, lon: -99.1332, city: "Mexico City", country: "Mexico", timezone: "America/Mexico_City" },
    { name: "Toronto, Canada", lat: 43.6510, lon: -79.3470, city: "Toronto", country: "Canada", timezone: "America/Toronto" },
    { name: "Buenos Aires, Argentina", lat: -34.6037, lon: -58.3816, city: "Buenos Aires", country: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
    { name: "Lagos, Nigeria", lat: 6.5244, lon: 3.3792, city: "Lagos", country: "Nigeria", timezone: "Africa/Lagos" },
    { name: "Dhaka, Bangladesh", lat: 23.8103, lon: 90.4125, city: "Dhaka", country: "Bangladesh", timezone: "Asia/Dhaka" },
    { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011, city: "Karachi", country: "Pakistan", timezone: "Asia/Karachi" },
    { name: "Tehran, Iran", lat: 35.6892, lon: 51.3890, city: "Tehran", country: "Iran", timezone: "Asia/Tehran" },
    { name: "Riyadh, Saudi Arabia", lat: 24.7136, lon: 46.6753, city: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
    { name: "Jakarta, Indonesia", lat: -6.2088, lon: 106.8456, city: "Jakarta", country: "Indonesia", timezone: "Asia/Jakarta" },
  ];
  
  // Pick a city based on IP hash for consistency
  let cityIndex = 0;
  if (ip) {
    const ipHash = ip.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    cityIndex = Math.abs(ipHash) % globalCities.length;
  } else {
    cityIndex = Math.floor(Math.random() * globalCities.length);
  }
  
  const city = globalCities[cityIndex];
  console.log(`🌍 Using global fallback: ${city.city}, ${city.country}`);
  
  return {
    latitude: city.lat,
    longitude: city.lon,
    locationName: city.name,
    city: city.city,
    country: city.country,
    timezone: city.timezone,
    source: 'global-fallback'
  };
};

// Reverse geocode coordinates to get location name
const reverseGeocode = (latitude: number, longitude: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'TravelBuddyApp/1.0',
        'Accept-Language': 'en'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.display_name || "Unknown location");
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
};

// Update user location in database
const updateUserLocation = async (userId: string, locationData: LocationData): Promise<UserLocation> => {
  console.log(`💾 Saving location for user ${userId}: ${locationData.city}, ${locationData.country}`);
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      locationName: locationData.locationName,
      city: locationData.city,
      country: locationData.country,
      timezone: locationData.timezone,
      locationUpdatedAt: new Date(),
      enableLiveLocation: locationData.source === 'browser'
    },
    select: {
      id: true,
      name: true,
      email: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      timezone: true,
      locationUpdatedAt: true,
      profileImage: true,
      enableLiveLocation: true
    }
  });

  console.log(`✅ Location saved successfully: ${updatedUser.city}, ${updatedUser.country}`);

  return {
    ...updatedUser,
    latitude: updatedUser.latitude ?? null,
    longitude: updatedUser.longitude ?? null,
    locationName: updatedUser.locationName ?? null,
    city: updatedUser.city ?? null,
    country: updatedUser.country ?? null,
    timezone: updatedUser.timezone ?? null,
    locationUpdatedAt: updatedUser.locationUpdatedAt ?? null,
    profileImage: updatedUser.profileImage ?? null,
    locationSource: locationData.source || 'unknown',
    enableLiveLocation: updatedUser.enableLiveLocation
  };
};

// Get user's location from database
const getUserLocation = async (userId: string): Promise<UserLocation> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      timezone: true,
      locationUpdatedAt: true,
      profileImage: true,
      enableLiveLocation: true
    }
  });
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  
  return {
    ...user,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    locationName: user.locationName ?? null,
    city: user.city ?? null,
    country: user.country ?? null,
    timezone: user.timezone ?? null,
    locationUpdatedAt: user.locationUpdatedAt ?? null,
    profileImage: user.profileImage ?? null,
    enableLiveLocation: user.enableLiveLocation
  };
};

// Get or create location for user - NOW DETECTS GLOBALLY
const getOrCreateUserLocation = async (userId: string, ip?: string): Promise<UserLocation> => {
  console.log(`🚀 Getting/creating location for user ${userId} from IP: ${ip}`);
  
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      timezone: true,
      locationUpdatedAt: true,
      profileImage: true,
      enableLiveLocation: true
    }
  });

  // Check if user has no location or location is very old (>30 days)
  const shouldUpdateLocation = !user?.locationUpdatedAt || 
    (user.locationUpdatedAt && 
     new Date().getTime() - new Date(user.locationUpdatedAt).getTime() > 30 * 24 * 60 * 60 * 1000);

  if (!user?.latitude || !user?.longitude || shouldUpdateLocation) {
    console.log(`🔄 Creating/updating location for user ${userId}`);
    console.log(`📡 Using IP: ${ip}`);
    
    try {
      let locationData: LocationData;
      
      if (ip) {
        // Try to get location from IP
        locationData = await getLocationFromIP(ip);
      } else {
        // No IP provided, use global fallback
        console.log(`❓ No IP provided, using global fallback`);
        locationData = getGlobalFallback();
      }
      
      const result = await updateUserLocation(userId, locationData);
      console.log(`🎯 Location set to: ${result.city}, ${result.country} (Source: ${locationData.source})`);
      return result;
    } catch (error) {
      console.error("❌ Failed to create/update location:", error);
      console.log(`🔄 Using global as final fallback`);
      const defaultLocation = getGlobalFallback(ip);
      return await updateUserLocation(userId, defaultLocation);
    }
  } else {
    console.log(`✅ Using existing location: ${user.city}, ${user.country}`);
    console.log(`⏰ Location age: ${Math.round((new Date().getTime() - new Date(user.locationUpdatedAt!).getTime()) / (1000 * 60 * 60 * 24))} days`);
  }

  return {
    ...user,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    locationName: user.locationName ?? null,
    city: user.city ?? null,
    country: user.country ?? null,
    timezone: user.timezone ?? null,
    locationUpdatedAt: user.locationUpdatedAt ?? null,
    profileImage: user.profileImage ?? null,
    enableLiveLocation: user.enableLiveLocation
  };
};

// Get multiple users locations
const getUsersLocations = async (userIds: string[]) => {
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      latitude: { not: null },
      longitude: { not: null }
    },
    select: {
      id: true,
      name: true,
      profileImage: true,
      latitude: true,
      longitude: true,
      locationName: true,
      city: true,
      country: true,
      enableLiveLocation: true
    }
  });

  return users.map(user => ({
    ...user,
    profileImage: user.profileImage ?? null,
    locationName: user.locationName ?? null,
    city: user.city ?? null,
    country: user.country ?? null,
    enableLiveLocation: user.enableLiveLocation
  }));
};

// Update location from browser coordinates
const updateLocationFromCoordinates = async (
  userId: string, 
  latitude: number, 
  longitude: number
): Promise<UserLocation> => {
  console.log(`📍 Updating location from browser coordinates: ${latitude}, ${longitude}`);
  
  try {
    // Get location name from coordinates
    const locationName = await reverseGeocode(latitude, longitude);
    console.log(`🗺️ Reverse geocode result: ${locationName}`);
    
    return await updateUserLocation(userId, {
      latitude,
      longitude,
      locationName,
      source: 'browser'
    });
  } catch (error) {
    console.error("❌ Reverse geocode failed:", error);
    // Update with just coordinates
    return await updateUserLocation(userId, {
      latitude,
      longitude,
      locationName: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
      source: 'browser'
    });
  }
};

// Add a new function to manually set location
const setManualLocation = async (
  userId: string,
  country: string,
  city: string,
  latitude?: number,
  longitude?: number
): Promise<UserLocation> => {
  console.log(`✏️ Setting manual location: ${city}, ${country}`);
  
  let locationData: LocationData;
  
  if (latitude && longitude) {
    // Use provided coordinates
    locationData = {
      latitude,
      longitude,
      city,
      country,
      locationName: `${city}, ${country}`,
      source: 'manual'
    };
  } else {
    // Try to get coordinates from city/country name
    console.log(`📍 Getting coordinates for ${city}, ${country}`);
    const coordinates = await getCoordinatesFromPlaceName(city, country);
    locationData = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city,
      country,
      locationName: `${city}, ${country}`,
      source: 'manual'
    };
  }
  
  return await updateUserLocation(userId, locationData);
};

// Helper to get coordinates from place name
const getCoordinatesFromPlaceName = async (city: string, country: string): Promise<{ latitude: number, longitude: number }> => {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&limit=1`;
    
    console.log(`🌐 Fetching coordinates from: ${url}`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'TravelBuddyApp/1.0',
        'Accept-Language': 'en'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            console.log(`✅ Found coordinates: ${results[0].lat}, ${results[0].lon}`);
            resolve({
              latitude: parseFloat(results[0].lat),
              longitude: parseFloat(results[0].lon)
            });
          } else {
            console.log(`❌ No coordinates found for ${city}, ${country}`);
            reject(new Error('Location not found'));
          }
        } catch (error) {
          console.error(`❌ Error parsing coordinates:`, error);
          reject(error);
        }
      });
    }).on('error', reject);
  });
};

export const LocationService = {
  getLocationFromIP,
  reverseGeocode,
  updateUserLocation,
  getUserLocation,
  getOrCreateUserLocation,
  getUsersLocations,
  updateLocationFromCoordinates,
  setManualLocation,
  getCoordinatesFromPlaceName
};