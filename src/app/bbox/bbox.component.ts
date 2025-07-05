import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-geosearch';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-draw';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bbox',
  imports: [FormsModule],
  templateUrl: './bbox.component.html',
  styleUrl: './bbox.component.scss',
})
export class BboxComponent implements AfterViewInit {
  bboxMode: 'exclusive' | 'inclusive' = 'exclusive';
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private rectangleLayer: L.Rectangle | null = null;
  private polygonsLayer: L.GeoJSON | null = null;
  private lastBbox: [number, number, number, number] | null = null;

  // UI State properties
  isLoading: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | 'info' = 'info';

  ngAfterViewInit(): void {
    this.initMap();

    // Patch for leaflet-draw readableArea bug
    const geometryUtil = (L as any).GeometryUtil;
    if (geometryUtil) {
      geometryUtil.readableArea = function (
        area: number,
        type: string = 'metric'
      ): string {
        let areaStr;
        if (type === 'imperial') {
          area *= 0.000247105; // convert m² to acres
          areaStr =
            area >= 1
              ? `${area.toFixed(2)} acres`
              : `${(area * 43560).toFixed(0)} ft²`;
        } else {
          // Default to metric
          areaStr =
            area >= 1000000
              ? `${(area * 0.000001).toFixed(2)} km²`
              : `${area.toFixed(0)} m²`;
        }
        return areaStr;
      };
    }
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

  onBboxModeChange() {
    if (this.lastBbox) {
      const [minLong, minLat, maxLong, maxLat] = this.lastBbox;
      this.fetchFieldsForBbox(minLong, minLat, maxLong, maxLat);
    }
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

    // Add custom control for bbox mode
    const BboxModeControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control bbox-mode-toggle');
        div.style.background = 'white';
        div.style.border = '1px solid var(--border-color)';
        div.style.borderRadius = 'var(--border-radius)';
        div.style.padding = '0.75rem 1rem';
        div.style.margin = '10px';
        div.style.fontSize = '0.875rem';
        div.style.boxShadow = 'var(--shadow-medium)';
        div.style.fontWeight = '500';
        div.style.color = 'var(--text-primary)';
        div.style.minWidth = '200px';
        div.innerHTML = `
          <div style="margin-bottom: 0.5rem; font-weight: 600; color: var(--primary-color);">
            Filter Mode
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem 0;">
              <input type="radio" name="bboxModeCtl" value="exclusive" checked style="margin: 0;" />
              <span>Exclusive (Partially Inside)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem 0;">
              <input type="radio" name="bboxModeCtl" value="inclusive" style="margin: 0;" />
              <span>Inclusive (Fully Inside)</span>
            </label>
          </div>
        `;
        // Prevent map drag when interacting with control
        L.DomEvent.disableClickPropagation(div);
        // Add event listeners
        const radios = div.querySelectorAll(
          'input[type="radio"][name="bboxModeCtl"]'
        );
        radios.forEach((radio: any) => {
          radio.addEventListener('change', (event: any) => {
            this.bboxMode = event.target.value;
            this.onBboxModeChange();
          });
        });
        return div;
      },
      onRemove: (map: L.Map) => {},
    });
    this.map.addControl(new BboxModeControl({ position: 'topleft' }));

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

    // Add draw control for rectangle only
    this.map.addLayer(this.drawnItems);
    const drawControl = new (L as any).Control.Draw({
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#dc143c',
            weight: 4,
          },
        },
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
    });
    this.map.addControl(drawControl);

    this.map.on('draw:created', (e: any) => {
      if (this.rectangleLayer) {
        this.drawnItems.removeLayer(this.rectangleLayer);
      }
      const layer = e.layer;
      if (layer instanceof L.Rectangle) {
        this.rectangleLayer = layer;
        this.drawnItems.addLayer(layer);
        const bounds = layer.getBounds();
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        const minLong = southWest.lng;
        const minLat = southWest.lat;
        const maxLong = northEast.lng;
        const maxLat = northEast.lat;
        this.lastBbox = [minLong, minLat, maxLong, maxLat];
        this.fetchFieldsForBbox(minLong, minLat, maxLong, maxLat);
      }
    });

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);
  }

  private polygonPopupContent(properties: any): string {
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

  private fetchFieldsForBbox(
    minLong: number,
    minLat: number,
    maxLong: number,
    maxLat: number
  ) {
    this.setLoading(true);
    this.showStatus('Fetching fields in selected area...', 'info');

    const url = `https://api.digifarm.io/v1/delineated-fields?token=a0731a8c-5259-4c68-af3a-7ad4f6d53faa&bbox=${minLong},${minLat},${maxLong},${maxLat}&data_version=latest&billing=by_field`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // Remove previous polygons
        if (this.polygonsLayer) {
          this.map.removeLayer(this.polygonsLayer);
        }
        if (
          !data ||
          !data.features ||
          !Array.isArray(data.features) ||
          data.features.length === 0
        ) {
          this.showStatus('No fields found in selected area', 'error');
          this.setLoading(false);
          return;
        }

        let features = data.features;
        if (this.bboxMode === 'inclusive') {
          // Only keep features fully inside the bbox
          features = features.filter((feature: any) => {
            const coords =
              feature.geometry.type === 'Polygon'
                ? feature.geometry.coordinates[0]
                : feature.geometry.type === 'MultiPolygon'
                ? feature.geometry.coordinates.flat(1)
                : [];
            return coords.every(
              ([lng, lat]: [number, number]) =>
                lng >= minLong &&
                lng <= maxLong &&
                lat >= minLat &&
                lat <= maxLat
            );
          });
        }

        if (!features.length) {
          this.showStatus(
            'No fields match the current filter criteria',
            'error'
          );
          this.setLoading(false);
          return;
        }

        this.polygonsLayer = L.geoJSON(
          { ...data, features },
          {
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
              color: '#71a3c1',
              weight: 2,
              fillOpacity: 0.5,
            },
          }
        ).addTo(this.map);

        this.showStatus(
          `Found ${features.length} fields in selected area`,
          'success'
        );
        this.setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching fields:', error);
        this.showStatus('Error loading field data', 'error');
        this.setLoading(false);
      });
  }
}
