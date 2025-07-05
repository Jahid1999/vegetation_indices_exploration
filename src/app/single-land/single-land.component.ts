import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-geosearch';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-single-land',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-land.component.html',
  styleUrl: './single-land.component.scss',
})
export class SingleLandComponent implements AfterViewInit {
  private map!: L.Map;
  private polygonLayer: L.GeoJSON | null = null;
  private token: string = '';
  private seasonFieldInfo: any = null;

  // UI State properties
  isLoading: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | 'info' = 'info';

  ngAfterViewInit(): void {
    this.fetchToken();
    this.initMap();
  }

  private showStatus(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    duration: number = 3000
  ): void {
    this.statusMessage = message;
    this.statusType = type;

    setTimeout(() => {
      this.statusMessage = '';
    }, duration);
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  private fetchToken(): void {
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

    fetch('https://identity.geosys-na.com/v2.1/connect/token', requestOptions)
      .then((response) => response.json())
      .then((result) => {
        console.log('Token response:', result);
        if (result.access_token) {
          this.token = result.access_token;
          console.log('Token saved:', this.token);
        }
      })
      .catch((error) => console.error('Error fetching token:', error));
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [60.74253680491523, 11.190083037110668],
      zoom: 13,
    });

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }
    );

    const satelliteLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      {
        maxZoom: 19,
        attribution: '© Google Satellite',
      }
    );

    const baseMaps = {
      Satellite: satelliteLayer,
      OpenStreetMap: osmLayer,
    };

    satelliteLayer.addTo(this.map);
    L.control.layers(baseMaps).addTo(this.map);

    // Add search control
    const provider = new OpenStreetMapProvider();
    const searchControl = GeoSearchControl({
      provider: provider,
      style: 'bar',
      searchLabel: 'Search...',
      showMarker: true,
      retainZoomLevel: false,
      animateZoom: true,
      autoClose: true,
      keepResult: true,
    });
    this.map.addControl(searchControl);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.fetchAndDrawPolygon(lng, lat);
    });
  }

  private polygonPopupContent(properties: any): string {
    if (this.seasonFieldInfo) {
      const info = this.seasonFieldInfo;
      // Format date
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE'); // DD.MM.YYYY
      };
      return `
        <div style="font-family: 'Inter', sans-serif; max-width: 300px;">
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary-color); margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border-color);">
            ${info.field?.name || 'Field Information'}
          </div>
          <div style="display: grid; gap: 0.5rem; font-size: 0.875rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Grower:</span>
              <span style="color: var(--text-primary);">${
                info.field?.farm?.grower?.companyName || 'N/A'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Farm:</span>
              <span style="color: var(--text-primary);">${
                info.field?.farm?.name || 'N/A'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Crop:</span>
              <span style="color: var(--text-primary);">${
                info.crop?.name || 'N/A'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Sowing Date:</span>
              <span style="color: var(--text-primary);">${
                formatDate(info.sowingDate || '') || 'N/A'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Irrigated:</span>
              <span style="color: var(--text-primary);">${
                info.isIrrigated ? 'Yes' : 'No'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Crop Usage:</span>
              <span style="color: var(--text-primary);">${
                info.cropUsage?.name || 'N/A'
              }</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
              <span style="font-weight: 600; color: var(--text-secondary);">Area (ha):</span>
              <span style="color: var(--text-primary);">${
                info.acreage != null ? info.acreage.toFixed(2) : 'N/A'
              }</span>
            </div>
          </div>
        </div>
      `;
    }
    if (!properties) return '';
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 250px;">
        <div style="font-weight: 700; font-size: 1rem; color: var(--primary-color); margin-bottom: 0.5rem;">
          Field Details
        </div>
        <div style="display: grid; gap: 0.25rem; font-size: 0.875rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--text-secondary);">ID:</span>
            <span style="color: var(--text-primary);">${
              properties.id || 'N/A'
            }</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--text-secondary);">Area:</span>
            <span style="color: var(--text-primary);">${
              properties.area || 'N/A'
            } m²</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--text-secondary);">Acres:</span>
            <span style="color: var(--text-primary);">${
              properties.area_acres || 'N/A'
            }</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--text-secondary);">Hectares:</span>
            <span style="color: var(--text-primary);">${
              properties.area_ha || 'N/A'
            }</span>
          </div>
        </div>
      </div>
    `;
  }

  private fetchAndDrawPolygon(lng: number, lat: number) {
    this.seasonFieldInfo = null; // Reset on new click
    this.setLoading(true);
    this.showStatus('Fetching field data...', 'info');

    const url = `https://api.digifarm.io/v1/delineated-fields/location?token=a0731a8c-5259-4c68-af3a-7ad4f6d53faa&location=${lng},${lat}&data_version=latest&simplified_geometry=false`;
    fetch(url)
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson || !geojson.geometry) {
          this.showStatus('No field data found at this location', 'error');
          this.setLoading(false);
          return;
        }

        // Remove previous polygon
        if (this.polygonLayer) {
          this.map.removeLayer(this.polygonLayer);
        }

        // Draw new polygon
        this.polygonLayer = L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
            layer.on('mouseover', (e: L.LeafletMouseEvent) => {
              const content = this.polygonPopupContent(feature.properties);
              (layer as L.Polygon).bindPopup(content).openPopup(e.latlng);
            });
            layer.on('mouseout', () => {
              (layer as L.Polygon).closePopup();
            });
          },
          style: {
            color: '#3388ff',
            weight: 3,
            fillOpacity: 0.3,
          },
        }).addTo(this.map);

        this.showStatus('Field data loaded successfully', 'success');
        this.setLoading(false);

        // Call the second API with the field ID from the response
        if (geojson.properties && geojson.properties.id) {
          this.fetchSeasonFields(geojson.properties.id);
        }
      })
      .catch((error) => {
        console.error('Error fetching field data:', error);
        this.showStatus('Error loading field data', 'error');
        this.setLoading(false);
      });
  }

  private fetchSeasonFields(fieldId: string) {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${this.token}`);
    const raw = JSON.stringify({
      query: {
        filters: [
          {
            alias: 'SowingDate',
            expression: '$lte:2025-07-03',
          },
          {
            alias: 'EstimatedHarvestDate',
            expression: '$gte:2025-07-03',
          },
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
    fetch(
      'https://api.geosys-na.net/DomainManagement/Geosys.DomainManagement.WebAPI/V6/seasonfields',
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (result && Array.isArray(result) && result.length > 0) {
          this.seasonFieldInfo = result[0];
        } else {
          this.seasonFieldInfo = null;
        }
        console.log('Season fields response:', result);
      })
      .catch((error) => {
        this.seasonFieldInfo = null;
        console.error('Error fetching season fields:', error);
      });
  }
}
