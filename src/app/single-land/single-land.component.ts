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
  polygonLayer: L.GeoJSON | null = null;
  private token: string = '';
  private seasonFieldInfo: any = null;
  private ndviLayer: L.ImageOverlay | null = null;
  private ndviControlDiv: HTMLDivElement | null = null;
  private ndviControlButton: HTMLButtonElement | null = null;
  private ndviData: any = null;
  private ImageSensorId: string = '';
  private mapsArray: any[] = [];
  private imageTypeControlDiv: HTMLDivElement | null = null;
  private imageTypeSelect: HTMLSelectElement | null = null;
  private selectedImageType: string = 'NDVI';
  private imageUrl: string = '';
  private imageData: any = null;

  // UI State properties
  isLoading: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  showNDVI: boolean = false;

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

    // Add custom NDVI control
    const NDVIControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control ndvi-control');
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '4px';
        div.style.padding = '0';
        div.style.display = 'none'; // Initially hidden

        const button = L.DomUtil.create('button', 'ndvi-button', div);
        button.innerHTML = 'Show NDVI';
        button.style.background = 'var(--primary-color)';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '8px 16px';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        button.style.fontWeight = '600';
        button.style.fontFamily = 'inherit';

        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleNDVI();
        });

        button.addEventListener('mouseover', () => {
          button.style.background = 'var(--primary-light)';
        });

        button.addEventListener('mouseout', () => {
          button.style.background = 'var(--primary-color)';
        });

        // Prevent map drag when interacting with control
        L.DomEvent.disableClickPropagation(div);

        // Store reference to the control for later updates
        this.ndviControlDiv = div;
        this.ndviControlButton = button;

        return div;
      },
      onRemove: (map: L.Map) => {},
    });

    this.map.addControl(new NDVIControl({ position: 'bottomright' }));

    // Add Image Type Control
    const ImageTypeControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create(
          'div',
          'leaflet-control image-type-control'
        );
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '4px';
        div.style.padding = '8px';
        div.style.display = 'none'; // Initially hidden
        div.style.minWidth = '150px';

        const label = L.DomUtil.create('label', '', div);
        label.innerHTML = 'Image Type:';
        label.style.display = 'block';
        label.style.marginBottom = '4px';
        label.style.fontSize = '12px';
        label.style.fontWeight = '600';
        label.style.color = 'var(--text-secondary)';

        const select = L.DomUtil.create('select', 'image-type-select', div);
        select.style.width = '100%';
        select.style.padding = '4px';
        select.style.border = '1px solid #ccc';
        select.style.borderRadius = '4px';
        select.style.fontSize = '12px';
        select.style.fontFamily = 'inherit';

        select.addEventListener('change', (e) => {
          this.selectedImageType = (e.target as HTMLSelectElement).value;
          this.fetchSensorInfo();
        });

        // Prevent map drag when interacting with control
        L.DomEvent.disableClickPropagation(div);

        // Store reference to the control for later updates
        this.imageTypeControlDiv = div;
        this.imageTypeSelect = select;

        return div;
      },
      onRemove: (map: L.Map) => {},
    });

    this.map.addControl(new ImageTypeControl({ position: 'topleft' }));

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
    this.showNDVI = false; // Reset NDVI state
    this.imageUrl = ''; // Clear image URL
    this.imageData = null; // Clear image data
    if (this.ndviControlButton) {
      this.ndviControlButton.innerHTML = 'Show NDVI';
    }
    this.removeNDVIOverlay(); // Remove any existing NDVI overlay

    // Hide image type control when drawing new polygon
    if (this.imageTypeControlDiv) {
      this.imageTypeControlDiv.style.display = 'none';
    }

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

        // Draw new polygon with proper initial opacity
        this.polygonLayer = L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
            layer.on('mouseover', (e: L.LeafletMouseEvent) => {
              // Only show popup if no image overlay is active
              if (!this.ndviLayer) {
                const content = this.polygonPopupContent(feature.properties);
                (layer as L.Polygon).bindPopup(content).openPopup(e.latlng);
              }
            });
            layer.on('mouseout', () => {
              (layer as L.Polygon).closePopup();
            });
          },
          style: {
            color: '#3388ff',
            weight: 3,
            fillOpacity: 0.3, // Default opacity for new polygons
          },
        }).addTo(this.map);

        // Show NDVI control when polygon is drawn
        this.showNDVIControl();

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

  toggleNDVI(): void {
    if (!this.polygonLayer) return;

    this.showNDVI = !this.showNDVI;

    if (this.showNDVI) {
      this.fetchSensorInfo();
    } else {
      this.removeNDVIOverlay();
      if (this.imageTypeControlDiv) {
        this.imageTypeControlDiv.style.display = 'none';
      }

      // Ensure polygon opacity is restored when hiding through toggle
      if (this.polygonLayer) {
        this.polygonLayer.setStyle({
          fillOpacity: 0.3,
        });
      }
    }

    // Update button text
    if (this.ndviControlButton) {
      this.ndviControlButton.innerHTML = this.showNDVI
        ? 'Hide NDVI'
        : 'Show NDVI';
    }
  }

  private fetchSensorInfo(): void {
    if (!this.token) {
      this.showStatus('Authentication token not available', 'error');
      return;
    }

    this.setLoading(true);
    this.showStatus('Fetching NDVI data...', 'info');

    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    };

    fetch(
      `https://api.geosys-na.net/field-level-maps/v5/season-fields/7exrdrn/catalog-imagery?$fields=Image.Date,Image.Id,coveragePercent,Maps.Type,Image.spatialResolution,Image.sensor,mask&$limit=none&$count=true&mask=auto&Image.Date=$between:2025-06-30|2025-06-30&coveragePercent=$gte:0&Maps.Type=$in:${this.selectedImageType}`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        this.ndviData = result;

        // Extract ImageSensorId and maps array from the response
        if (result && Array.isArray(result) && result.length > 0) {
          const firstItem = result[0];
          if (firstItem.image && firstItem.image.id) {
            this.ImageSensorId = firstItem.image.id;
          }

          if (firstItem.maps && Array.isArray(firstItem.maps)) {
            this.mapsArray = firstItem.maps;
            console.log('Maps array stored:', this.mapsArray);

            // Populate and show image type control
            this.populateImageTypeControl();
            this.showImageTypeControl();
          }
        }

        this.showStatus('Sensor data loaded successfully', 'success');

        // Call the second API to get map data
        this.fetchImageData();

        this.setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching NDVI data:', error);
        this.showStatus('Error loading NDVI data', 'error');
        this.setLoading(false);
      });
  }

  private fetchImageData(): void {
    if (!this.token) {
      this.showStatus('Authentication token not available', 'error');
      return;
    }

    if (!this.ImageSensorId) {
      this.showStatus('Image sensor ID not available', 'error');
      return;
    }

    this.setLoading(true);
    this.showStatus('Fetching map data...', 'info');

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${this.token}`);

    const raw = JSON.stringify({
      mapParams: [
        {
          image: {
            id: this.ImageSensorId,
          },
          seasonField: {
            id: this.seasonFieldInfo.id,
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

    fetch(
      `https://api.geosys-na.net/field-level-maps/v5/map-sets/base-reference-map/${this.selectedImageType}?directLinks=true&legendType=Dynamic&$epsg-out=3857&histogram=true`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        this.imageData = result;

        // Extract image URL from the response
        if (result && Array.isArray(result) && result.length > 0) {
          const firstResult = result[0];
          if (
            firstResult.maps &&
            Array.isArray(firstResult.maps) &&
            firstResult.maps.length > 0
          ) {
            const firstMap = firstResult.maps[0];
            if (firstMap._links && firstMap._links['image:image/png']) {
              this.imageUrl = firstMap._links['image:image/png'];
              console.log('Image URL extracted:', this.imageUrl);
            }
          }
        }

        this.showStatus('Map data loaded successfully', 'success');
        this.addNDVIOverlay();
        this.setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching map data:', error);
        this.showStatus('Error loading map data', 'error');
        this.setLoading(false);
      });
  }

  private addNDVIOverlay(): void {
    if (!this.polygonLayer) return;

    // Check if we have a valid image URL
    if (!this.imageUrl) {
      this.showStatus('No image URL available', 'error');
      return;
    }

    // Get bounds of the drawn polygon
    const bounds = this.polygonLayer.getBounds();

    // Create image overlay with the actual image URL from API
    this.ndviLayer = L.imageOverlay(this.imageUrl, bounds, {
      opacity: 0.7,
      interactive: false,
    }).addTo(this.map);

    // Set highest z-index for the image overlay
    setTimeout(() => {
      if (this.ndviLayer && this.ndviLayer.getElement()) {
        this.ndviLayer.getElement()!.style.zIndex = '1000';
      }
    }, 100);

    // Make polygon fill transparent when showing image overlay
    this.polygonLayer.setStyle({
      fillOpacity: 0,
    });

    this.showStatus(`${this.selectedImageType} overlay added`, 'success');
  }

  private removeNDVIOverlay(): void {
    if (this.ndviLayer) {
      this.map.removeLayer(this.ndviLayer);
      this.ndviLayer = null;
      this.imageUrl = ''; // Clear image URL

      // Restore polygon fill opacity when hiding image overlay
      if (this.polygonLayer) {
        this.polygonLayer.setStyle({
          fillOpacity: 0.3,
        });
      }

      this.showStatus(`${this.selectedImageType} overlay removed`, 'info');
    }
  }

  private showNDVIControl(): void {
    if (this.ndviControlDiv) {
      this.ndviControlDiv.style.display = 'block';
    }
  }

  private populateImageTypeControl(): void {
    if (this.imageTypeSelect && this.mapsArray.length > 0) {
      // Clear existing options
      this.imageTypeSelect.innerHTML = '';

      // Add options from maps array
      this.mapsArray.forEach((map) => {
        const option = document.createElement('option');
        option.value = map.type;
        option.textContent = map.type;

        if (map.type === this.selectedImageType) {
          option.selected = true;
        }

        this.imageTypeSelect!.appendChild(option);
      });
    }
  }

  private showImageTypeControl(): void {
    if (this.imageTypeControlDiv) {
      this.imageTypeControlDiv.style.display = 'block';
    }
  }
}
