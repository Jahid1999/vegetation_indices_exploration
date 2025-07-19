import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class MapApiService {
  private token: string = '';

  constructor(private http: HttpClient) {}

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

  fetchAnalyticsStatus(
    fromDate: string,
    toDate: string,
    seasonFieldId: string
  ): Promise<any> {
    const url = `http://202.4.127.187:4114/status?fromDate=${fromDate}&toDate=${toDate}&seasonFieldId=${seasonFieldId}`;
    return this.http.get(url).toPromise();
  }

  responseData = {
    line_chart: [
      {
        category_percentages: {
          Excellent: 68.15016098463225,
          Good: 31.747113705884328,
          Moderate: 0.10272530948342222,
          Poor: 0,
        },
        date: 'Fri, 18 Jul 2025 00:00:00 GMT',
        max_ndvi: 0.8942,
        mean_ndvi: 0.8098919907291119,
        min_ndvi: 0.4971,
        std_dev_ndvi: 0.08046715593636454,
      },
      {
        category_percentages: {
          Excellent: 69.50121404486256,
          Good: 27.70365962250278,
          Moderate: 2.7951263326346605,
          Poor: 0,
        },
        date: 'Tue, 15 Jul 2025 00:00:00 GMT',
        max_ndvi: 0.8973,
        mean_ndvi: 0.7833273788048319,
        min_ndvi: 0.4393,
        std_dev_ndvi: 0.1043179353627158,
      },
      {
        category_percentages: {
          Excellent: 74.03980088141941,
          Good: 11.941977028292193,
          Moderate: 14.0182220902884,
          Poor: 0,
        },
        date: 'Sat, 12 Jul 2025 00:00:00 GMT',
        max_ndvi: 0.9274,
        mean_ndvi: 0.7732225972187337,
        min_ndvi: 0.3456,
        std_dev_ndvi: 0.16539850922272437,
      },
      {
        category_percentages: {
          Excellent: 75.15356335487407,
          Good: 5.432375037106387,
          Moderate: 19.414061608019548,
          Poor: 0,
        },
        date: 'Thu, 10 Jul 2025 00:00:00 GMT',
        max_ndvi: 0.9344,
        mean_ndvi: 0.775822517297285,
        min_ndvi: 0.3249,
        std_dev_ndvi: 0.18316759557543272,
      },
      {
        category_percentages: {
          Excellent: 74.83753111227821,
          Good: 2.2272965999132293,
          Moderate: 22.93517228780855,
          Poor: 0,
        },
        date: 'Tue, 08 Jul 2025 00:00:00 GMT',
        max_ndvi: 0.9321,
        mean_ndvi: 0.7725873963875505,
        min_ndvi: 0.2999,
        std_dev_ndvi: 0.2061725760166442,
      },
      {
        category_percentages: {
          Excellent: 92.63010070102527,
          Good: 7.369899298974722,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Mon, 30 Jun 2025 00:00:00 GMT',
        max_ndvi: 0.9588,
        mean_ndvi: 0.8866926540771356,
        min_ndvi: 0.6482,
        std_dev_ndvi: 0.05300487816496409,
      },
      {
        category_percentages: {
          Excellent: 96.8301201473501,
          Good: 3.1698798526498964,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Wed, 18 Jun 2025 00:00:00 GMT',
        max_ndvi: 0.9524,
        mean_ndvi: 0.8856837257095881,
        min_ndvi: 0.7308,
        std_dev_ndvi: 0.03371735109792775,
      },
      {
        category_percentages: {
          Excellent: 90.66403306464504,
          Good: 9.335966935354966,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Fri, 13 Jun 2025 00:00:00 GMT',
        max_ndvi: 0.9464,
        mean_ndvi: 0.859758004703948,
        min_ndvi: 0.6574,
        std_dev_ndvi: 0.04605438993752689,
      },
      {
        category_percentages: {
          Excellent: 89.34304569223391,
          Good: 10.656954307766082,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Thu, 12 Jun 2025 00:00:00 GMT',
        max_ndvi: 0.9423,
        mean_ndvi: 0.855424159112187,
        min_ndvi: 0.6398,
        std_dev_ndvi: 0.04700452579316713,
      },
      {
        category_percentages: {
          Excellent: 29.723928481720822,
          Good: 70.27607151827918,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Tue, 03 Jun 2025 00:00:00 GMT',
        max_ndvi: 0.9094,
        mean_ndvi: 0.766262514557121,
        min_ndvi: 0.5338,
        std_dev_ndvi: 0.06392992578418231,
      },
      {
        category_percentages: {
          Excellent: 8.697737081268695,
          Good: 90.63130760469903,
          Moderate: 0.670955314032282,
          Poor: 0,
        },
        date: 'Sat, 31 May 2025 00:00:00 GMT',
        max_ndvi: 0.8986,
        mean_ndvi: 0.6801320210992624,
        min_ndvi: 0.431,
        std_dev_ndvi: 0.07909178047495359,
      },
      {
        category_percentages: {
          Excellent: 5.003082684447286,
          Good: 94.50159379223237,
          Moderate: 0.49532352332036067,
          Poor: 0,
        },
        date: 'Thu, 29 May 2025 00:00:00 GMT',
        max_ndvi: 0.8568,
        mean_ndvi: 0.6614817048386729,
        min_ndvi: 0.4513,
        std_dev_ndvi: 0.07058924834872671,
      },
      {
        category_percentages: {
          Excellent: 0.25536677933369567,
          Good: 28.94336361136801,
          Moderate: 70.80126960929829,
          Poor: 0,
        },
        date: 'Mon, 19 May 2025 00:00:00 GMT',
        max_ndvi: 0.8089,
        mean_ndvi: 0.4565661669673236,
        min_ndvi: 0.2647,
        std_dev_ndvi: 0.10325113380088895,
      },
      {
        category_percentages: {
          Excellent: 0.26756533668023613,
          Good: 12.549551554147065,
          Moderate: 87.1828831091727,
          Poor: 0,
        },
        date: 'Wed, 14 May 2025 00:00:00 GMT',
        max_ndvi: 0.813,
        mean_ndvi: 0.4028911287192017,
        min_ndvi: 0.2244,
        std_dev_ndvi: 0.10175590978537707,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 83.99744251364373,
          Poor: 16.002557486356267,
        },
        date: 'Tue, 06 May 2025 00:00:00 GMT',
        max_ndvi: 0.4977,
        mean_ndvi: 0.2672182300824333,
        min_ndvi: 0.1595,
        std_dev_ndvi: 0.05736945055195014,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 91.27486127919987,
          Poor: 8.725138720800135,
        },
        date: 'Sun, 04 May 2025 00:00:00 GMT',
        max_ndvi: 0.4813,
        mean_ndvi: 0.27347638092845883,
        min_ndvi: 0.1779,
        std_dev_ndvi: 0.05161985246182084,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 77.61286050282008,
          Poor: 22.387139497179913,
        },
        date: 'Sat, 26 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.3689,
        mean_ndvi: 0.21832240312378692,
        min_ndvi: 0.1542,
        std_dev_ndvi: 0.027967332852822015,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 73.3473386157605,
          Poor: 26.65266138423949,
        },
        date: 'Sat, 26 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.4444,
        mean_ndvi: 0.2197123056196196,
        min_ndvi: 0.152,
        std_dev_ndvi: 0.035311077091761844,
      },
    ],
    status: {
      cultivation_timeline: "May'25-Present",
      cultivation_times: 1,
      current_status: 'Mature crop',
      harvesting_times: 0,
      idle_periods: 0,
    },
  };
}
