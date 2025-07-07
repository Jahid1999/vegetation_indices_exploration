import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapApiService {
  private token: string = '';

  constructor() {}

  // Fetch authentication token
  fetchToken(): Promise<string> {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');
    myHeaders.append(
      'Cookie',
      'refresh_token=69704F92EC426259E792A04B4941F763A4F063E63647344EBDEB16E44645364D'
    );

    const urlencoded = new URLSearchParams();
    urlencoded.append('grant_type', 'password');
    urlencoded.append('client_id', 'eu_research_and_development_agency_demo');
    urlencoded.append('username', 'EU_RESEARCH_AND_DEVELOPMENT_AGENCY');
    urlencoded.append('password', 'da0acec5');
    urlencoded.append('scope', 'openid offline_access');
    urlencoded.append(
      'client_secret',
      'eu_research_and_development_agency_demo.secret'
    );

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };

    return fetch(
      'https://identity.geosys-na.com/v2.1/connect/token',
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (result.access_token) {
          this.token = result.access_token;
          return this.token;
        }
        throw new Error('No access token received');
      })
      .catch((error) => {
        console.error('Error fetching token:', error);
        throw error;
      });
  }

  // Get current token
  getToken(): string {
    return this.token;
  }

  // Fetch field data by location
  fetchFieldData(lng: number, lat: number): Promise<any> {
    const url = `https://api.digifarm.io/v1/delineated-fields/location?token=a0731a8c-5259-4c68-af3a-7ad4f6d53faa&location=${lng},${lat}&data_version=latest&simplified_geometry=false`;

    return fetch(url)
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson || !geojson.geometry) {
          throw new Error('No field data found at this location');
        }
        return geojson;
      })
      .catch((error) => {
        console.error('Error fetching field data:', error);
        throw error;
      });
  }

  // Fetch season fields data
  fetchSeasonFields(fieldId: string): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication token not available');
    }

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const raw = JSON.stringify({
      query: {
        filters: [
          "Field.Farm.Grower.Id=='kxmymkd'",
          "Field.Farm.Id=='z62x36'",
          `Field.Name=='${fieldId}'`,
        ],
        limit: -1,
      },
      fields: [
        'id',
        'field.id',
        'field.name',
        'field.farm.id',
        'field.farm.name',
        'field.farm.grower.id',
        'field.farm.grower.companyname',
        'acreage',
        'crop.id',
        'crop.name',
        'cropVariety.id',
        'sowingDate',
        'estimatedHarvestDate',
        'isIrrigated',
        'cropUsage.id',
        'cropUsage.name',
        'UserYield',
        'externalIds',
        'fsaFarmId',
        'fsaFieldId',
        'fsaTractId',
      ],
    });

    const requestOptions: RequestInit = {
      method: 'SEARCH',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    return fetch(
      'https://api.geosys-na.net/DomainManagement/Geosys.DomainManagement.WebAPI/V6/seasonfields',
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (result && Array.isArray(result) && result.length > 0) {
          return result[0];
        }
        return null;
      })
      .catch((error) => {
        console.error('Error fetching season fields:', error);
        throw error;
      });
  }

  // Fetch sensor info for specific image type
  fetchSensorInfo(selectedImageType: string): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication token not available');
    }

    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    };

    // Generate current date and three months back in YYYY-MM-DD format
    const currentDate = new Date();
    const threeMonthsBack = new Date(currentDate);
    threeMonthsBack.setMonth(currentDate.getMonth() - 3);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const endDate = formatDate(currentDate);
    const startDate = formatDate(threeMonthsBack);

    return fetch(
      `https://api.geosys-na.net/field-level-maps/v5/season-fields/7exrdrn/catalog-imagery?$fields=Image.Date,Image.Id,coveragePercent,Maps.Type,Image.spatialResolution,Image.sensor,mask&$limit=none&$count=true&mask=auto&Image.Date=$between:${startDate}|${endDate}&coveragePercent=$gte:0&Maps.Type=$in:${selectedImageType}`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (!result || !Array.isArray(result) || result.length === 0) {
          throw new Error('No sensor data found');
        }
        return result;
      })
      .catch((error) => {
        console.error('Error fetching sensor info:', error);
        throw error;
      });
  }

  // Fetch image data for map overlay
  fetchImageData(
    imageSensorId: string,
    seasonFieldId: string,
    selectedImageType: string
  ): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication token not available');
    }

    if (!imageSensorId) {
      throw new Error('Image sensor ID not available');
    }

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const raw = JSON.stringify({
      mapParams: [
        {
          image: {
            id: imageSensorId,
          },
          seasonField: {
            id: seasonFieldId,
          },
        },
      ],
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    return fetch(
      `https://api.geosys-na.net/field-level-maps/v5/map-sets/base-reference-map/${selectedImageType}?directLinks=true&legendType=Dynamic&$epsg-out=3857&histogram=true`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (!result || !Array.isArray(result) || result.length === 0) {
          throw new Error('No image data found');
        }
        return result;
      })
      .catch((error) => {
        console.error('Error fetching image data:', error);
        throw error;
      });
  }
}
