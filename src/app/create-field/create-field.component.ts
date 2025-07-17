import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-geosearch';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-draw';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-field',
  imports: [FormsModule],
  templateUrl: './create-field.component.html',
  styleUrl: './create-field.component.scss',
})
export class CreateFieldComponent implements AfterViewInit {
  bboxMode: 'exclusive' | 'inclusive' = 'exclusive';
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private polygonsLayer: L.GeoJSON | null = null;
  private lastBbox: [number, number, number, number] | null = null;

  // UI State properties
  isLoading: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  isCreating: boolean = false;

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

    // Add draw control for rectangle only
    this.map.addLayer(this.drawnItems);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    this.fetchFieldsForBbox();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Find the polygon that contains this point
      let clickedLayer = null;
      if (this.polygonsLayer) {
        this.polygonsLayer.eachLayer((layer: any) => {
          // Check if the point is inside the polygon
          if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
            // Additional check for more precise polygon containment
            if (layer.feature && layer.feature.geometry) {
              clickedLayer = layer;
            }
          }
        });
      }

      if (clickedLayer) {
        this.createField(lng, lat, clickedLayer);
      } else {
        this.showStatus('Please click on an existing field polygon', 'info');
      }
    });
  }

  private fetchFieldsForBbox() {
    this.setLoading(true);
    this.showStatus('Fetching fields in selected area...', 'info');

    const url = `https://api.digifarm.io/v1/delineated-fields?token=a0731a8c-5259-4c68-af3a-7ad4f6d53faa&bbox=11.121579488178838,60.72865589318412,11.218031432797279,60.76690662484408&data_version=latest&billing=by_field`;
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
              // layer.on('mouseover', (e: L.LeafletMouseEvent) => {
              //   const content = this.polygonPopupContent(feature.properties);
              //   (layer as L.Polygon).bindPopup(content).openPopup(e.latlng);
              // });
              // layer.on('mouseout', () => {
              //   (layer as L.Polygon).closePopup();
              // });
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

  private createField(lng: number, lat: number, clickedLayer: any) {
    this.isCreating = true;
    this.setLoading(true);
    this.showStatus('Creating field...', 'info');

    const payload = {
      geoLocation: {
        type: 'point',
        minLong: 0,
        maxLong: 0,
        minLat: 0,
        maxLat: 0,
        lat: lat,
        long: lng,
      },
      fieldInfo: {
        farmId: 'z62x36',
        cropId: 'HAY_GRASS',
        cropVariety: '',
        isIrrigated: true,
        sowingDate: new Date().toISOString(),
      },
    };

    fetch('https://gljg5m5d-7104.asse.devtunnels.ms/api/GeoJson/featureAuto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        this.isCreating = false;
        this.setLoading(false);
        this.showStatus('Field created successfully!', 'success');
        this.isCreating = false;
        // Change the clicked polygon color to green
        this.updatePolygonColor(clickedLayer, '#22c55e', 'success');
      })
      .catch((error) => {
        console.error('Error creating field:', error);
        this.setLoading(false);
        this.showStatus('Error creating field', 'error');

        // Change the clicked polygon color to red
        this.updatePolygonColor(clickedLayer, '#ef4444', 'error');
      });
  }

  private updatePolygonColor(
    layer: any,
    color: string,
    status: 'success' | 'error'
  ) {
    if (layer && layer.setStyle) {
      layer.setStyle({
        color: color,
        weight: 3,
        fillOpacity: 0.7,
        fillColor: color,
      });

      // Update popup to show the status
      const statusText =
        status === 'success' ? 'Field Created' : 'Creation Failed';
      const statusIcon = status === 'success' ? '✅' : '❌';

      layer.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; max-width: 250px;">
          <div style="font-weight: 700; font-size: 1rem; color: ${color}; margin-bottom: 0.5rem;">
            ${statusIcon} ${statusText}
          </div>
          <div style="display: grid; gap: 0.25rem; font-size: 0.875rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: var(--text-secondary);">Status:</span>
              <span style="color: ${color}; font-weight: 600;">${statusText}</span>
            </div>
          </div>
        </div>
      `);
    }
  }
}
