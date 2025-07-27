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
          this.test(result[0].id);
          return result[0];
        }
        return null;
      })
      .catch((error) => {
        console.error('Error fetching season fields:', error);
        throw error;
      });
  }

  test(seasonFieldId: string) {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const raw = JSON.stringify({
      query: {
        filters: [
          `SeasonField.Id=='${seasonFieldId}'`,
          "Index=='NDVI'",
          'IsExtrapolated==false',
          "Date>='2015-01-01'",
          "isInTimeFrame(Date,'01-01','12-31')",
        ],
        rowGroups: [
          `season:"year(nextDateOccurence(Date,'12-31',true))"`,
          `label:"ifthenelse(Equal(year(first(Date)),year(last(Date))),concat(year(first(Date)),''),
              concat(year(first(Date)),'-',year(last(Date))))"`,
        ],
        fields: ['Date', 'Value'],
        limit: -1,
      },
    });

    const requestOptions: RequestInit = {
      method: 'SEARCH',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    return fetch(
      'https://api.geosys-na.net/vegetation-time-series/v1/season-fields/values',
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        // Process the result as needed
        console.log('NDVI Time Series:', result);
        return result;
      })
      .catch((error) => {
        console.error('Error fetching vegetation time series:', error);
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
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 85.12547667435435,
          Poor: 14.87452332564565,
        },
        date: 'Wed, 09 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.3202,
        mean_ndvi: 0.2271718996186605,
        min_ndvi: 0.162,
        std_dev_ndvi: 0.02641129006260405,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 84.65051492247619,
          Poor: 15.349485077523806,
        },
        date: 'Sun, 06 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.385,
        mean_ndvi: 0.23073453519968942,
        min_ndvi: 0.1584,
        std_dev_ndvi: 0.030749830327118487,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 97.02692211083964,
          Poor: 2.9730778891603684,
        },
        date: 'Fri, 04 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.3489,
        mean_ndvi: 0.24848251432877402,
        min_ndvi: 0.1784,
        std_dev_ndvi: 0.028101232078872152,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 85.20425638800721,
          Poor: 14.795743611992792,
        },
        date: 'Thu, 03 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.3752,
        mean_ndvi: 0.23822496746055308,
        min_ndvi: 0.1526,
        std_dev_ndvi: 0.03449176758201001,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 2.0163039755212018,
          Poor: 97.98369602447879,
        },
        date: 'Tue, 01 Apr 2025 00:00:00 GMT',
        max_ndvi: 0.2295,
        mean_ndvi: 0.16511814331057473,
        min_ndvi: 0.1179,
        std_dev_ndvi: 0.01707682197548808,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 98.19024234509779,
          Poor: 1.809757654902201,
        },
        date: 'Sat, 22 Mar 2025 00:00:00 GMT',
        max_ndvi: 0.434,
        mean_ndvi: 0.2858026568172996,
        min_ndvi: 0.1187,
        std_dev_ndvi: 0.033765712488859616,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 100,
        },
        date: 'Mon, 17 Mar 2025 00:00:00 GMT',
        max_ndvi: 0.12,
        mean_ndvi: 0.0930612632155824,
        min_ndvi: 0.0606,
        std_dev_ndvi: 0.006199366280609797,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 96.8538656614558,
        },
        date: 'Wed, 05 Mar 2025 00:00:00 GMT',
        max_ndvi: 0.1525,
        mean_ndvi: 0.09040050464686139,
        min_ndvi: -0.0556,
        std_dev_ndvi: 0.0280866037816432,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 98.61506587427061,
        },
        date: 'Tue, 17 Dec 2024 00:00:00 GMT',
        max_ndvi: 0.1778,
        mean_ndvi: 0.05779709542620966,
        min_ndvi: -0.0276,
        std_dev_ndvi: 0.0223786207953849,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 1.9143140923658997,
          Poor: 6.523107413354193,
        },
        date: 'Wed, 27 Nov 2024 00:00:00 GMT',
        max_ndvi: 0.348,
        mean_ndvi: -0.09420995364555977,
        min_ndvi: -0.3705,
        std_dev_ndvi: 0.08358852848787747,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 17.879569794259357,
          Moderate: 82.12043020574065,
          Poor: 0,
        },
        date: 'Fri, 11 Oct 2024 00:00:00 GMT',
        max_ndvi: 0.6873,
        mean_ndvi: 0.39057208457972736,
        min_ndvi: 0.215,
        std_dev_ndvi: 0.10387095513454479,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 5.5092518591251265,
          Moderate: 94.40093165574407,
          Poor: 0.08981648513080484,
        },
        date: 'Thu, 03 Oct 2024 00:00:00 GMT',
        max_ndvi: 0.6242,
        mean_ndvi: 0.34915152878313893,
        min_ndvi: 0.1838,
        std_dev_ndvi: 0.08133446207248701,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 10.565615509327975,
          Moderate: 89.43438449067203,
          Poor: 0,
        },
        date: 'Sat, 28 Sep 2024 00:00:00 GMT',
        max_ndvi: 0.6618,
        mean_ndvi: 0.4023852145320028,
        min_ndvi: 0.2012,
        std_dev_ndvi: 0.07526998946495858,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 12.458612106957732,
          Moderate: 87.54138789304227,
          Poor: 0,
        },
        date: 'Thu, 26 Sep 2024 00:00:00 GMT',
        max_ndvi: 0.7406,
        mean_ndvi: 0.4061693158723997,
        min_ndvi: 0.2077,
        std_dev_ndvi: 0.08568444168668139,
      },
      {
        category_percentages: {
          Excellent: 25.7543443016007,
          Good: 11.85075240335215,
          Moderate: 61.56067833570378,
          Poor: 0.8342249593433724,
        },
        date: 'Fri, 13 Sep 2024 00:00:00 GMT',
        max_ndvi: 0.8807,
        mean_ndvi: 0.5019631276688055,
        min_ndvi: 0.1943,
        std_dev_ndvi: 0.24588785733093593,
      },
      {
        category_percentages: {
          Excellent: 20.657639348754365,
          Good: 16.163770465599526,
          Moderate: 57.397130672801744,
          Poor: 5.781459512844359,
        },
        date: 'Fri, 06 Sep 2024 00:00:00 GMT',
        max_ndvi: 0.863,
        mean_ndvi: 0.4710222798164091,
        min_ndvi: 0.1726,
        std_dev_ndvi: 0.2567601970943836,
      },
      {
        category_percentages: {
          Excellent: 31.851361328675047,
          Good: 5.702966227479282,
          Moderate: 56.25442422304934,
          Poor: 6.191248220796323,
        },
        date: 'Sun, 01 Sep 2024 00:00:00 GMT',
        max_ndvi: 0.8932,
        mean_ndvi: 0.4990863676843331,
        min_ndvi: 0.1751,
        std_dev_ndvi: 0.27008525784137627,
      },
      {
        category_percentages: {
          Excellent: 32.311099947480194,
          Good: 13.157353915009248,
          Moderate: 54.53154613751055,
          Poor: 0,
        },
        date: 'Mon, 19 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.8977,
        mean_ndvi: 0.5720928276208527,
        min_ndvi: 0.248,
        std_dev_ndvi: 0.21500047612989162,
      },
      {
        category_percentages: {
          Excellent: 33.498504327175574,
          Good: 31.92747699404015,
          Moderate: 34.57401867878428,
          Poor: 0,
        },
        date: 'Sat, 17 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.9073,
        mean_ndvi: 0.6265823522024068,
        min_ndvi: 0.319,
        std_dev_ndvi: 0.18709910702432578,
      },
      {
        category_percentages: {
          Excellent: 22.822711392231625,
          Good: 45.880049322951166,
          Moderate: 31.29723928481721,
          Poor: 0,
        },
        date: 'Wed, 14 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.8702,
        mean_ndvi: 0.6137906880094992,
        min_ndvi: 0.3446,
        std_dev_ndvi: 0.15402092607648452,
      },
      {
        category_percentages: {
          Excellent: 34.16071061585185,
          Good: 64.40070330874798,
          Moderate: 1.4385860754001782,
          Poor: 0,
        },
        date: 'Mon, 12 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.9274,
        mean_ndvi: 0.7231314799168818,
        min_ndvi: 0.4548,
        std_dev_ndvi: 0.12515030577288414,
      },
      {
        category_percentages: {
          Excellent: 58.51848468933392,
          Good: 41.48151531066609,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Fri, 02 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.9129,
        mean_ndvi: 0.8125714726097778,
        min_ndvi: 0.6316,
        std_dev_ndvi: 0.04078562525063155,
      },
      {
        category_percentages: {
          Excellent: 58.40887813120818,
          Good: 41.59112186879182,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Fri, 02 Aug 2024 00:00:00 GMT',
        max_ndvi: 0.9127,
        mean_ndvi: 0.8125913764756925,
        min_ndvi: 0.6302,
        std_dev_ndvi: 0.0406560076108295,
      },
      {
        category_percentages: {
          Excellent: 82.32594250222638,
          Good: 17.674057497773617,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Tue, 30 Jul 2024 00:00:00 GMT',
        max_ndvi: 0.9223,
        mean_ndvi: 0.8300388441075058,
        min_ndvi: 0.6396,
        std_dev_ndvi: 0.03649687750507073,
      },
      {
        category_percentages: {
          Excellent: 89.69926700614253,
          Good: 10.300732993857466,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Thu, 25 Jul 2024 00:00:00 GMT',
        max_ndvi: 0.8978,
        mean_ndvi: 0.8332717603269928,
        min_ndvi: 0.6216,
        std_dev_ndvi: 0.03731388099897332,
      },
      {
        category_percentages: {
          Excellent: 91.72013792158565,
          Good: 8.279862078414359,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Tue, 23 Jul 2024 00:00:00 GMT',
        max_ndvi: 0.9042,
        mean_ndvi: 0.8568691982736967,
        min_ndvi: 0.6526,
        std_dev_ndvi: 0.04374052623766603,
      },
      {
        category_percentages: {
          Excellent: 18.012011051994612,
          Good: 81.98798894800538,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Sat, 20 Jul 2024 00:00:00 GMT',
        max_ndvi: 0.8324,
        mean_ndvi: 0.7527842235060398,
        min_ndvi: 0.5469,
        std_dev_ndvi: 0.049222251287477745,
      },
      {
        category_percentages: {
          Excellent: 61.05039618203823,
          Good: 3.9531431964012516,
          Moderate: 34.99646062156052,
          Poor: 0,
        },
        date: 'Tue, 25 Jun 2024 00:00:00 GMT',
        max_ndvi: 0.92,
        mean_ndvi: 0.6795172516155551,
        min_ndvi: 0.2308,
        std_dev_ndvi: 0.25608328863134044,
      },
      {
        category_percentages: {
          Excellent: 0.35748258071015243,
          Good: 59.68498996056356,
          Moderate: 15.929486447605779,
          Poor: 24.028041011120497,
        },
        date: 'Mon, 03 Jun 2024 00:00:00 GMT',
        max_ndvi: 0.8354,
        mean_ndvi: 0.47316758614390436,
        min_ndvi: 0.1308,
        std_dev_ndvi: 0.22306179699045028,
      },
      {
        category_percentages: {
          Excellent: 0.5874304675576782,
          Good: 59.91082267792219,
          Moderate: 17.230150937364417,
          Poor: 22.27159591715571,
        },
        date: 'Mon, 03 Jun 2024 00:00:00 GMT',
        max_ndvi: 0.8284,
        mean_ndvi: 0.4777891592263604,
        min_ndvi: 0.1263,
        std_dev_ndvi: 0.22252694803558798,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 79.6862512273651,
          Poor: 20.313748772634895,
        },
        date: 'Tue, 21 May 2024 00:00:00 GMT',
        max_ndvi: 0.4069,
        mean_ndvi: 0.2399163610622702,
        min_ndvi: 0.1386,
        std_dev_ndvi: 0.043627115206552866,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 67.79393967072363,
          Poor: 32.20606032927637,
        },
        date: 'Sun, 19 May 2024 00:00:00 GMT',
        max_ndvi: 0.3869,
        mean_ndvi: 0.22076009750416734,
        min_ndvi: 0.129,
        std_dev_ndvi: 0.03897599264624754,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 23.19777133331811,
          Poor: 76.8022286666819,
        },
        date: 'Thu, 16 May 2024 00:00:00 GMT',
        max_ndvi: 0.3912,
        mean_ndvi: 0.18929897928892744,
        min_ndvi: 0.125,
        std_dev_ndvi: 0.035181128972524255,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 48.06704267805357,
          Poor: 51.932957321946425,
        },
        date: 'Tue, 14 May 2024 00:00:00 GMT',
        max_ndvi: 0.3971,
        mean_ndvi: 0.20611878953257368,
        min_ndvi: 0.1314,
        std_dev_ndvi: 0.03502897750577658,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 16.47751923823442,
          Poor: 83.52248076176558,
        },
        date: 'Sat, 11 May 2024 00:00:00 GMT',
        max_ndvi: 0.2908,
        mean_ndvi: 0.1760470337725207,
        min_ndvi: 0.1305,
        std_dev_ndvi: 0.02663018328062672,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 1.1140268686289083,
          Moderate: 79.38285619487438,
          Poor: 19.5031169364967,
        },
        date: 'Sat, 04 May 2024 00:00:00 GMT',
        max_ndvi: 0.5727,
        mean_ndvi: 0.23132746100975043,
        min_ndvi: 0.161,
        std_dev_ndvi: 0.04987312167146517,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 72.9089123832576,
          Poor: 27.091087616742403,
        },
        date: 'Wed, 01 May 2024 00:00:00 GMT',
        max_ndvi: 0.4701,
        mean_ndvi: 0.220464969287329,
        min_ndvi: 0.1484,
        std_dev_ndvi: 0.037037572118578124,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 96.35101500239765,
          Poor: 3.6489849976023567,
        },
        date: 'Sun, 21 Apr 2024 00:00:00 GMT',
        max_ndvi: 0.4412,
        mean_ndvi: 0.24532878884753268,
        min_ndvi: 0.1757,
        std_dev_ndvi: 0.031929695932057085,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 99.92464549128857,
          Poor: 0.0753545087114379,
        },
        date: 'Tue, 16 Apr 2024 00:00:00 GMT',
        max_ndvi: 0.4034,
        mean_ndvi: 0.25042106272691983,
        min_ndvi: 0.1884,
        std_dev_ndvi: 0.026343364687419588,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 95.35012118701293,
        },
        date: 'Mon, 25 Mar 2024 00:00:00 GMT',
        max_ndvi: 0.1795,
        mean_ndvi: 0.0995134153860206,
        min_ndvi: -0.092,
        std_dev_ndvi: 0.04468772817607742,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 40.57497773616788,
        },
        date: 'Sun, 17 Mar 2024 00:00:00 GMT',
        max_ndvi: 0.035,
        mean_ndvi: -0.0024186719338707098,
        min_ndvi: -0.0861,
        std_dev_ndvi: 0.0128902978721674,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 2.4420080182416632,
        },
        date: 'Thu, 01 Feb 2024 00:00:00 GMT',
        max_ndvi: 0.0197,
        mean_ndvi: -0.04213986025163839,
        min_ndvi: -0.0732,
        std_dev_ndvi: 0.0119061845480488,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 5.006127311061889,
          Moderate: 94.40225963118235,
          Poor: 0.591613057755758,
        },
        date: 'Thu, 19 Oct 2023 00:00:00 GMT',
        max_ndvi: 0.6651,
        mean_ndvi: 0.355300058228484,
        min_ndvi: 0.1918,
        std_dev_ndvi: 0.08551098116451492,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 9.220651702326856,
          Moderate: 90.25738696989966,
          Poor: 0.5219613277734912,
        },
        date: 'Tue, 17 Oct 2023 00:00:00 GMT',
        max_ndvi: 0.6931,
        mean_ndvi: 0.3690885746580504,
        min_ndvi: 0.1891,
        std_dev_ndvi: 0.09536076913225083,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 10.809946795149909,
          Moderate: 89.12013038208129,
          Poor: 0.06992282276881695,
        },
        date: 'Thu, 12 Oct 2023 00:00:00 GMT',
        max_ndvi: 0.7415,
        mean_ndvi: 0.3859300915671454,
        min_ndvi: 0.1931,
        std_dev_ndvi: 0.09177069654783875,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 11.207270568355673,
          Moderate: 88.79272943164432,
          Poor: 0,
        },
        date: 'Mon, 09 Oct 2023 00:00:00 GMT',
        max_ndvi: 0.6941,
        mean_ndvi: 0.40640019066974187,
        min_ndvi: 0.2443,
        std_dev_ndvi: 0.07729827621587908,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 10.573227075864484,
          Moderate: 89.4267729241355,
          Poor: 0,
        },
        date: 'Wed, 04 Oct 2023 00:00:00 GMT',
        max_ndvi: 0.7847,
        mean_ndvi: 0.3935632544013884,
        min_ndvi: 0.2411,
        std_dev_ndvi: 0.09179066787430798,
      },
      {
        category_percentages: {
          Excellent: 0.9220510456762251,
          Good: 7.957602475815033,
          Moderate: 90.97420440100777,
          Poor: 0.1461420775009705,
        },
        date: 'Sun, 24 Sep 2023 00:00:00 GMT',
        max_ndvi: 0.851,
        mean_ndvi: 0.36350316146416095,
        min_ndvi: 0.0747,
        std_dev_ndvi: 0.10399142318509208,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 2.9182746100975048,
          Moderate: 97.0817253899025,
          Poor: 0,
        },
        date: 'Thu, 14 Sep 2023 00:00:00 GMT',
        max_ndvi: 0.64,
        mean_ndvi: 0.3220447103418354,
        min_ndvi: 0.2096,
        std_dev_ndvi: 0.06322507008172658,
      },
      {
        category_percentages: {
          Excellent: 7.603583602156837,
          Good: 8.909101073476256,
          Moderate: 81.00591979725942,
          Poor: 2.481395527107485,
        },
        date: 'Sat, 02 Sep 2023 00:00:00 GMT',
        max_ndvi: 0.8633,
        mean_ndvi: 0.3757149122005801,
        min_ndvi: 0.1879,
        std_dev_ndvi: 0.18364059431495033,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 4.222041216033409,
          Moderate: 75.5509818698479,
          Poor: 20.2269769141187,
        },
        date: 'Fri, 18 Aug 2023 00:00:00 GMT',
        max_ndvi: 0.6081,
        mean_ndvi: 0.28851763295503846,
        min_ndvi: 0.0902,
        std_dev_ndvi: 0.1043531650154812,
      },
      {
        category_percentages: {
          Excellent: 22.79017194528805,
          Good: 72.22044619003037,
          Moderate: 4.98938186468157,
          Poor: 0,
        },
        date: 'Thu, 03 Aug 2023 00:00:00 GMT',
        max_ndvi: 0.9628,
        mean_ndvi: 0.6884595620304615,
        min_ndvi: 0.3919,
        std_dev_ndvi: 0.14099553355176636,
      },
      {
        category_percentages: {
          Excellent: 29.975110177425616,
          Good: 70.0248898225744,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Sat, 29 Jul 2023 00:00:00 GMT',
        max_ndvi: 0.9257,
        mean_ndvi: 0.7457306247573813,
        min_ndvi: 0.5122,
        std_dev_ndvi: 0.0975696257554069,
      },
      {
        category_percentages: {
          Excellent: 75.3111227821798,
          Good: 24.6888772178202,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Wed, 19 Jul 2023 00:00:00 GMT',
        max_ndvi: 0.9225,
        mean_ndvi: 0.8331132658187383,
        min_ndvi: 0.6855,
        std_dev_ndvi: 0.04695014714940008,
      },
      {
        category_percentages: {
          Excellent: 70.95426209668211,
          Good: 29.04573790331788,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Sun, 09 Jul 2023 00:00:00 GMT',
        max_ndvi: 0.9286,
        mean_ndvi: 0.8237207715844996,
        min_ndvi: 0.5957,
        std_dev_ndvi: 0.05331706095770715,
      },
      {
        category_percentages: {
          Excellent: 21.789441234900554,
          Good: 72.80786883748544,
          Moderate: 5.402689927614002,
          Poor: 0,
        },
        date: 'Sat, 01 Jul 2023 00:00:00 GMT',
        max_ndvi: 0.9107,
        mean_ndvi: 0.7147974219624139,
        min_ndvi: 0.4207,
        std_dev_ndvi: 0.10933914123348201,
      },
      {
        category_percentages: {
          Excellent: 19.52823510606718,
          Good: 63.798780627040856,
          Moderate: 16.67298426689197,
          Poor: 0,
        },
        date: 'Mon, 26 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.9058,
        mean_ndvi: 0.6775755234854884,
        min_ndvi: 0.249,
        std_dev_ndvi: 0.1646890315617444,
      },
      {
        category_percentages: {
          Excellent: 2.8680382709565446,
          Good: 60.129092168459195,
          Moderate: 33.344750683138095,
          Poor: 3.658118877446167,
        },
        date: 'Fri, 16 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.8735,
        mean_ndvi: 0.5233577580891923,
        min_ndvi: 0.1613,
        std_dev_ndvi: 0.15876259673005094,
      },
      {
        category_percentages: {
          Excellent: 0.678520151386995,
          Good: 70.60867186560202,
          Moderate: 21.215082338280915,
          Poor: 7.49772564473007,
        },
        date: 'Sun, 11 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.8185,
        mean_ndvi: 0.5372321432649054,
        min_ndvi: 0.1605,
        std_dev_ndvi: 0.16076364709375787,
      },
      {
        category_percentages: {
          Excellent: 0.10503961820382253,
          Good: 55.771470326307856,
          Moderate: 36.31630625899117,
          Poor: 7.807183796497156,
        },
        date: 'Fri, 09 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.8087,
        mean_ndvi: 0.4977747608065215,
        min_ndvi: 0.16,
        std_dev_ndvi: 0.14995284129921688,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 19.75544036718197,
          Moderate: 72.34147009796087,
          Poor: 7.903089534857171,
        },
        date: 'Tue, 06 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.6907,
        mean_ndvi: 0.4116783801064096,
        min_ndvi: 0.1555,
        std_dev_ndvi: 0.11354741875499844,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 8.26387778868769,
          Moderate: 85.64001857222235,
          Poor: 6.0961036390899626,
        },
        date: 'Sun, 04 Jun 2023 00:00:00 GMT',
        max_ndvi: 0.6448,
        mean_ndvi: 0.38188190350055945,
        min_ndvi: 0.1638,
        std_dev_ndvi: 0.09579672300825826,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 3.8797623535391046,
          Moderate: 90.44505363683987,
          Poor: 5.675184009621023,
        },
        date: 'Tue, 30 May 2023 00:00:00 GMT',
        max_ndvi: 0.792,
        mean_ndvi: 0.3052207613088849,
        min_ndvi: 0.1706,
        std_dev_ndvi: 0.08582550733766046,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 3.139591539038185,
          Moderate: 88.96188586602655,
          Poor: 7.898522594935263,
        },
        date: 'Sat, 27 May 2023 00:00:00 GMT',
        max_ndvi: 0.7408,
        mean_ndvi: 0.2616567008426004,
        min_ndvi: 0.1661,
        std_dev_ndvi: 0.07658133192200421,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 2.7998526915134816,
          Moderate: 33.03007446579477,
          Poor: 64.17007284269175,
        },
        date: 'Sat, 20 May 2023 00:00:00 GMT',
        max_ndvi: 0.6863,
        mean_ndvi: 0.21047216564291094,
        min_ndvi: 0.1276,
        std_dev_ndvi: 0.07778867904331674,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0.28470112033515793,
          Moderate: 26.93197734425964,
          Poor: 72.7833215354052,
        },
        date: 'Mon, 15 May 2023 00:00:00 GMT',
        max_ndvi: 0.5181,
        mean_ndvi: 0.19218819902724182,
        min_ndvi: 0.1139,
        std_dev_ndvi: 0.04818610812554813,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 21.3892631242436,
          Poor: 78.6107368757564,
        },
        date: 'Fri, 12 May 2023 00:00:00 GMT',
        max_ndvi: 0.3313,
        mean_ndvi: 0.1815147089717535,
        min_ndvi: 0.1251,
        std_dev_ndvi: 0.028278095146643832,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 1.4802055467639554,
          Poor: 98.51979445323606,
        },
        date: 'Wed, 10 May 2023 00:00:00 GMT',
        max_ndvi: 0.2112,
        mean_ndvi: 0.15390454638869225,
        min_ndvi: 0.0892,
        std_dev_ndvi: 0.01610424905831928,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 35.295595186445325,
          Poor: 64.70440481355467,
        },
        date: 'Sun, 07 May 2023 00:00:00 GMT',
        max_ndvi: 0.3358,
        mean_ndvi: 0.19435026830772037,
        min_ndvi: 0.1202,
        std_dev_ndvi: 0.03371157837120142,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 60.62156052337131,
          Poor: 39.378439476628685,
        },
        date: 'Fri, 05 May 2023 00:00:00 GMT',
        max_ndvi: 0.3839,
        mean_ndvi: 0.21343501358664627,
        min_ndvi: 0.0283,
        std_dev_ndvi: 0.03628058550051843,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 80.13381133971183,
          Poor: 19.486167453515023,
        },
        date: 'Sat, 22 Apr 2023 00:00:00 GMT',
        max_ndvi: 0.4506,
        mean_ndvi: 0.22737949443975067,
        min_ndvi: -0.3137,
        std_dev_ndvi: 0.0437228555446591,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 82.21176900417875,
          Poor: 17.31338268555975,
        },
        date: 'Thu, 20 Apr 2023 00:00:00 GMT',
        max_ndvi: 0.401,
        mean_ndvi: 0.22296616125864863,
        min_ndvi: -0.3592,
        std_dev_ndvi: 0.040772861679067345,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 0,
        },
        date: 'Thu, 16 Mar 2023 00:00:00 GMT',
        max_ndvi: 0,
        mean_ndvi: -0.021260342977188137,
        min_ndvi: -0.0564,
        std_dev_ndvi: 0.009806721229912696,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 10.565615509327975,
        },
        date: 'Sat, 11 Mar 2023 00:00:00 GMT',
        max_ndvi: 0.0067,
        mean_ndvi: -0.004146752905715525,
        min_ndvi: -0.0152,
        std_dev_ndvi: 0.0026189391660066917,
      },
      {
        category_percentages: {
          Excellent: 0,
          Good: 0,
          Moderate: 0,
          Poor: 13.59578014751216,
        },
        date: 'Wed, 08 Mar 2023 00:00:00 GMT',
        max_ndvi: 0.0262,
        mean_ndvi: -0.0027365012673258287,
        min_ndvi: -0.0149,
        std_dev_ndvi: 0.0063943625960635984,
      },
    ],
    status: {
      cultivation_timeline: "Apr'23-Aug'23, Mar'24-Nov'24, Dec'24-Present",
      cultivation_times: 3,
      current_status: 'Mature crop',
      harvesting_times: 2,
      idle_periods: 10,
    },
  };
}
