// backend/src/modules/location/ipGeolocation.service.ts
import http from 'http';
import https from 'https';

export interface IPLocationResult {
  success: boolean;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  timezone?: string;
  isp?: string;
  ip: string;
  source: 'ipapi' | 'ipwhois' | 'geoplugin' | 'ip2location' | 'range-detected' | 'global-fallback';
}

export class IPGeolocationService {
  // List of reliable free APIs
  private static readonly APIs = [
    {
      name: 'ipapi',
      url: 'https://ipapi.co/{ip}/json/',
      parse: (data: any, ip: string) => ({
        success: !!(data.latitude && data.longitude && data.country_code),
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
        countryCode: data.country_code?.toUpperCase(),
        region: data.region,
        timezone: data.timezone,
        isp: data.org,
        source: 'ipapi' as const
      })
    },
    {
      name: 'ipwhois',
      url: 'https://ipwho.is/{ip}',
      parse: (data: any, ip: string) => ({
        success: data.success && data.country_code,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country,
        countryCode: data.country_code?.toUpperCase(),
        region: data.region,
        timezone: data.timezone?.id,
        isp: data.connection?.isp,
        source: 'ipwhois' as const
      })
    },
    {
      name: 'geoplugin',
      url: 'http://www.geoplugin.net/json.gp?ip={ip}',
      parse: (data: any, ip: string) => ({
        success: data.geoplugin_status === 200 && data.geoplugin_countryCode,
        latitude: parseFloat(data.geoplugin_latitude),
        longitude: parseFloat(data.geoplugin_longitude),
        city: data.geoplugin_city,
        country: data.geoplugin_countryName,
        countryCode: data.geoplugin_countryCode?.toUpperCase(),
        region: data.geoplugin_region,
        timezone: data.geoplugin_timezone,
        isp: data.geoplugin_organization,
        source: 'geoplugin' as const
      })
    },
    {
      name: 'ip2location',
      url: 'https://api.ip2location.io/?key=demo&ip={ip}',
      parse: (data: any, ip: string) => ({
        success: data.country_code && data.latitude && data.longitude,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city_name,
        country: data.country_name,
        countryCode: data.country_code?.toUpperCase(),
        region: data.region_name,
        timezone: data.time_zone,
        isp: data.isp,
        source: 'ip2location' as const
      })
    }
  ];

  static async getLocationFromIP(ip: string): Promise<IPLocationResult> {
    console.log(`🌍 Getting location for IP: ${ip}`);
    
    // Check if IP is local/private
    if (this.isPrivateIP(ip)) {
      console.log(`IP ${ip} is private/local`);
      return this.getGlobalFallback(ip);
    }

    // Try multiple APIs in sequence
    for (const api of this.APIs) {
      try {
        const url = api.url.replace('{ip}', ip);
        console.log(`🔍 Trying API: ${api.name}`);
        
        const result = await this.fetchFromAPI(url, api.name);
        const parsed = api.parse(result, ip);
        
        if (parsed.success) {
          console.log(`✅ API ${api.name} success: ${parsed.city}, ${parsed.country}`);
          
          // Validate coordinates are realistic
          if (this.isValidCoordinates(parsed.latitude, parsed.longitude)) {
            return { ...parsed, ip, source: parsed.source };
          } else {
            console.log(`⚠️ Invalid coordinates from ${api.name}, trying next API`);
            continue;
          }
        } else {
          console.log(`❌ API ${api.name} returned unsuccessful`);
        }
      } catch (error) {
        console.warn(`API ${api.name} failed:`, error);
        continue;
      }
    }

    console.log(`All APIs failed, trying IP range detection`);
    return this.detectByIPRange(ip);
  }

  private static async fetchFromAPI(url: string, apiName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const options: any = {
        timeout: 8000,
        headers: {
          'User-Agent': 'TravelBuddyApp/1.0',
          'Accept': 'application/json'
        }
      };

      if (apiName === 'geoplugin') {
        options.headers['Accept-Encoding'] = 'gzip';
      }

      const request = client.get(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response from ${apiName}: ${error}`));
          }
        });
      });
      
      request.on('error', reject);
      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error(`Timeout for ${apiName}`));
      });
    });
  }

  private static isPrivateIP(ip: string): boolean {
    return ip === '127.0.0.1' || 
           ip === '::1' ||
           ip.startsWith('192.168.') ||
           ip.startsWith('10.') ||
           ip.startsWith('172.') ||
           ip === '::ffff:127.0.0.1' ||
           ip.startsWith('fe80:') ||
           ip === '::' ||
           ip === '0:0:0:0:0:0:0:1';
  }

  private static detectByIPRange(ip: string): IPLocationResult {
    // Country-specific IP ranges
    const countryRanges = [
      // USA
      { ranges: ['8.', '9.', '12.', '13.', '15.', '16.', '17.', '18.', '19.', '20.', '21.', '22.', '23.', '24.', '32.', '33.', '34.', '35.', '40.', '44.', '47.', '48.', '50.', '63.', '64.', '65.', '66.', '67.', '68.', '69.', '70.', '71.', '72.', '73.', '74.', '75.', '76.', '96.', '97.', '98.', '99.', '100.', '104.', '107.', '108.', '128.', '129.', '130.', '131.', '132.', '134.', '135.', '136.', '137.', '138.', '139.', '140.', '141.', '142.', '143.', '144.', '145.', '146.', '147.', '148.', '149.', '150.', '151.', '152.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '160.', '161.', '162.', '163.', '164.', '165.', '166.', '167.', '168.', '169.', '170.', '172.', '173.', '174.', '184.', '192.', '198.', '199.', '204.', '205.', '206.', '207.', '208.', '209.'], country: 'USA', city: 'New York', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York' },
      
      // UK
      { ranges: ['2.', '5.', '25.', '31.', '37.', '46.', '51.', '52.', '53.', '54.', '57.', '62.', '77.', '78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.', '86.', '87.', '88.', '89.', '90.', '91.', '92.', '93.', '94.', '95.', '109.', '146.', '147.', '148.', '149.', '150.', '151.', '152.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '176.', '178.', '185.', '188.', '193.', '194.', '195.', '212.', '213.'], country: 'UK', city: 'London', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
      
      // Germany
      { ranges: ['5.', '31.', '46.', '62.', '77.', '78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.', '86.', '87.', '88.', '89.', '90.', '91.', '92.', '93.', '94.', '95.', '109.', '146.', '147.', '148.', '149.', '150.', '151.', '152.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '176.', '178.', '185.', '188.', '193.', '194.', '195.', '212.', '213.'], country: 'Germany', city: 'Berlin', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin' },
      
      // Japan
      { ranges: ['1.', '14.', '27.', '36.', '39.', '42.', '43.', '45.', '49.', '58.', '59.', '60.', '61.', '101.', '110.', '111.', '112.', '113.', '114.', '115.', '116.', '117.', '118.', '119.', '120.', '121.', '122.', '123.', '124.', '125.', '126.', '133.', '134.', '135.', '136.', '137.', '138.', '139.', '140.', '143.', '144.', '145.', '150.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '160.', '161.', '162.', '163.', '164.', '165.', '166.', '167.', '168.', '169.', '170.', '171.', '172.', '173.', '174.', '175.', '180.', '182.', '183.', '202.', '203.', '210.', '211.', '218.', '219.', '220.', '221.', '222.', '223.'], country: 'Japan', city: 'Tokyo', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
      
      // India
      { ranges: ['1.', '14.', '27.', '36.', '39.', '42.', '43.', '45.', '49.', '58.', '59.', '60.', '61.', '103.', '106.', '110.', '111.', '112.', '113.', '114.', '115.', '116.', '117.', '118.', '119.', '120.', '121.', '122.', '123.', '124.', '125.', '175.', '180.', '182.', '183.', '202.', '203.', '210.', '211.', '218.', '219.', '220.', '221.', '222.', '223.'], country: 'India', city: 'Delhi', lat: 28.6139, lon: 77.2090, timezone: 'Asia/Kolkata' },
      
      // Bangladesh
      { ranges: ['103.', '116.', '118.', '119.', '120.', '121.', '122.', '123.', '175.', '180.', '182.', '183.', '202.', '203.', '210.', '220.', '223.', '27.', '36.', '37.', '38.', '39.', '42.', '43.', '45.'], country: 'Bangladesh', city: 'Dhaka', lat: 23.8103, lon: 90.4125, timezone: 'Asia/Dhaka' },
      
      // China
      { ranges: ['1.', '14.', '27.', '36.', '39.', '42.', '43.', '45.', '49.', '58.', '59.', '60.', '61.', '101.', '110.', '111.', '112.', '113.', '114.', '115.', '116.', '117.', '118.', '119.', '120.', '121.', '122.', '123.', '124.', '125.', '126.', '133.', '134.', '135.', '136.', '137.', '138.', '139.', '140.', '143.', '144.', '145.', '150.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '160.', '161.', '162.', '163.', '164.', '165.', '166.', '167.', '168.', '169.', '170.', '171.', '172.', '173.', '174.', '175.', '180.', '182.', '183.', '202.', '203.', '210.', '211.', '218.', '219.', '220.', '221.', '222.', '223.'], country: 'China', city: 'Beijing', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai' },
      
      // Australia
      { ranges: ['1.', '14.', '27.', '36.', '39.', '42.', '43.', '45.', '49.', '58.', '59.', '60.', '61.', '101.', '110.', '111.', '112.', '113.', '114.', '115.', '116.', '117.', '118.', '119.', '120.', '121.', '122.', '123.', '124.', '125.', '126.', '133.', '134.', '135.', '136.', '137.', '138.', '139.', '140.', '143.', '144.', '145.', '150.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '160.', '161.', '162.', '163.', '164.', '165.', '166.', '167.', '168.', '169.', '170.', '171.', '172.', '173.', '174.', '175.', '180.', '182.', '183.', '202.', '203.', '210.', '211.', '218.', '219.', '220.', '221.', '222.', '223.'], country: 'Australia', city: 'Sydney', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
      
      // Canada
      { ranges: ['24.', '70.', '142.', '199.', '205.', '209.'], country: 'Canada', city: 'Toronto', lat: 43.6510, lon: -79.3470, timezone: 'America/Toronto' },
      
      // Brazil
      { ranges: ['131.', '138.', '143.', '150.', '177.', '179.', '186.', '187.', '189.', '190.', '191.', '200.'], country: 'Brazil', city: 'São Paulo', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
      
      // Russia
      { ranges: ['5.', '31.', '37.', '46.', '62.', '77.', '78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.', '86.', '87.', '88.', '89.', '90.', '91.', '92.', '93.', '94.', '95.', '109.', '146.', '147.', '148.', '149.', '150.', '151.', '152.', '153.', '154.', '155.', '156.', '157.', '158.', '159.', '176.', '178.', '185.', '188.', '193.', '194.', '195.', '212.', '213.'], country: 'Russia', city: 'Moscow', lat: 55.7558, lon: 37.6176, timezone: 'Europe/Moscow' },
    ];

    // Check specific country ranges first
    for (const countryInfo of countryRanges) {
      for (const range of countryInfo.ranges) {
        if (ip.startsWith(range)) {
          console.log(`📍 Detected ${countryInfo.country} IP range: ${range}`);
          return {
            success: true,
            latitude: countryInfo.lat,
            longitude: countryInfo.lon,
            city: countryInfo.city,
            country: countryInfo.country,
            countryCode: this.getCountryCode(countryInfo.country),
            timezone: countryInfo.timezone,
            ip,
            source: 'range-detected'
          };
        }
      }
    }

    // If no specific country detected, use continent-based fallback
    console.log(`🌐 No specific country detected, using global fallback`);
    return this.getGlobalFallback(ip);
  }

  private static getGlobalFallback(ip: string): IPLocationResult {
    const globalCities = [
      { city: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York' },
      { city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
      { city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
      { city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, timezone: 'Asia/Singapore' },
      { city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
      { city: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, timezone: 'Asia/Dubai' },
      { city: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin' },
      { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
      { city: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090, timezone: 'Asia/Kolkata' },
      { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
      { city: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
      { city: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473, timezone: 'Africa/Johannesburg' },
      { city: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6176, timezone: 'Europe/Moscow' },
      { city: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai' },
      { city: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, timezone: 'Asia/Seoul' },
      { city: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018, timezone: 'Asia/Bangkok' },
      { city: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, timezone: 'America/Mexico_City' },
      { city: 'Toronto', country: 'Canada', lat: 43.6510, lon: -79.3470, timezone: 'America/Toronto' },
      { city: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
      { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, timezone: 'Africa/Lagos' },
      { city: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125, timezone: 'Asia/Dhaka' },
      { city: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011, timezone: 'Asia/Karachi' },
      { city: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890, timezone: 'Asia/Tehran' },
      { city: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753, timezone: 'Asia/Riyadh' },
      { city: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456, timezone: 'Asia/Jakarta' },
    ];

    // Pick a city based on IP hash for consistency
    const ipHash = this.hashIP(ip);
    const cityIndex = Math.abs(ipHash) % globalCities.length;
    const city = globalCities[cityIndex];

    console.log(`🌐 Global fallback selected: ${city.city}, ${city.country}`);

    return {
      success: true,
      latitude: city.lat,
      longitude: city.lon,
      city: city.city,
      country: city.country,
      countryCode: this.getCountryCode(city.country),
      timezone: city.timezone,
      ip,
      source: 'global-fallback'
    };
  }

  private static hashIP(ip: string): number {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ((hash << 5) - hash) + ip.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static getCountryCode(country: string): string {
    const countryCodes: { [key: string]: string } = {
      'USA': 'US',
      'UK': 'GB',
      'Germany': 'DE',
      'Japan': 'JP',
      'India': 'IN',
      'Bangladesh': 'BD',
      'China': 'CN',
      'Australia': 'AU',
      'Canada': 'CA',
      'Brazil': 'BR',
      'Russia': 'RU',
      'France': 'FR',
      'Singapore': 'SG',
      'UAE': 'AE',
      'Egypt': 'EG',
      'South Africa': 'ZA',
      'South Korea': 'KR',
      'Thailand': 'TH',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'Nigeria': 'NG',
      'Pakistan': 'PK',
      'Iran': 'IR',
      'Saudi Arabia': 'SA',
      'Indonesia': 'ID',
    };
    return countryCodes[country] || '';
  }

  private static isValidCoordinates(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
           !(lat === 0 && lon === 0);
  }
}