import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-geosearch';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { CommonModule } from '@angular/common';
import { MapApiService } from '../services/map-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-single-land',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-land.component.html',
  styleUrl: './single-land.component.scss',
})
export class SingleLandComponent implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  polygonLayer: L.GeoJSON | null = null;
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

  // Date selection control properties
  private dateControlDiv: HTMLDivElement | null = null;
  private dateSelect: HTMLSelectElement | null = null;
  private selectedDateId: string = '';
  private selectedDate: string = '';
  private availableDates: any[] = [];

  // Histogram control properties
  private histogramControlDiv: HTMLDivElement | null = null;
  private histogramChart: Chart | null = null;
  private histogramData: any = null;
  private histogramCollapsed: boolean = false;

  // UI State properties
  isLoading: boolean = false;
  statusMessage: string = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  showNDVI: boolean = false;

  private analyticsControlDiv: HTMLDivElement | null = null;
  private analyticsControlButton: HTMLButtonElement | null = null;
  private showAnalytics: boolean = false;
  private analyticsModalDiv: HTMLDivElement | null = null;
  private analyticsChart: Chart | null = null;
  private analyticsStatus: any = null;
  private analyticsLineChartData: any[] = [];
  private analyticsChart2: Chart | null = null;

  constructor(private mapApiService: MapApiService) {}

  ngAfterViewInit(): void {
    this.fetchToken();
    this.initMap();
  }

  ngOnDestroy(): void {
    // Clean up Chart.js instance to prevent memory leaks
    if (this.histogramChart) {
      this.histogramChart.destroy();
      this.histogramChart = null;
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

  private fetchToken(): void {
    this.mapApiService
      .fetchToken()
      .then((token) => {
        console.log('Token fetched successfully');
      })
      .catch((error) => {
        console.error('Error fetching token:', error);
        this.showStatus('Failed to authenticate', 'error');
      });
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

    // Add custom NDVI control (Show Maps + Show Analytics)
    const NDVIControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control ndvi-control');
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '4px';
        div.style.padding = '0';
        div.style.display = 'none'; // Initially hidden
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.gap = '8px';

        // Show Analytics button
        const analyticsButton = L.DomUtil.create(
          'button',
          'analytics-button',
          div
        );
        analyticsButton.innerHTML = 'Show Analytics';
        analyticsButton.style.background = 'var(--primary-color)';
        analyticsButton.style.color = 'white';
        analyticsButton.style.border = 'none';
        analyticsButton.style.padding = '8px 16px';
        analyticsButton.style.borderRadius = '4px';
        analyticsButton.style.cursor = 'pointer';
        analyticsButton.style.fontSize = '14px';
        analyticsButton.style.fontWeight = '600';
        analyticsButton.style.fontFamily = 'inherit';
        analyticsButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleAnalytics();
        });
        analyticsButton.addEventListener('mouseover', () => {
          analyticsButton.style.background = 'var(--primary-light)';
        });
        analyticsButton.addEventListener('mouseout', () => {
          analyticsButton.style.background = 'var(--primary-color)';
        });
        this.analyticsControlButton = analyticsButton;
        this.analyticsControlDiv = div;

        // Show Maps button (existing)
        const button = L.DomUtil.create('button', 'ndvi-button', div);
        button.innerHTML = 'Show Maps';
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
        this.ndviControlDiv = div;
        this.ndviControlButton = button;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
      onRemove: (map: L.Map) => {},
    });
    this.map.addControl(new NDVIControl({ position: 'bottomright' }));

    this.updateNDVIAnalyticsControlVisibility();
    // Add Combined Image Type and Date Selection Control
    const ImageTypeAndDateControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create(
          'div',
          'leaflet-control image-type-date-control'
        );
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '4px';
        div.style.padding = '8px';
        div.style.display = 'none'; // Initially hidden
        div.style.minWidth = '370px';
        div.style.width = '370px';
        div.style.gap = '10px';
        div.style.alignItems = 'flex-end';

        // Date Selection Section
        const dateSection = L.DomUtil.create('div', 'date-section', div);
        dateSection.style.flex = '1';
        dateSection.style.minWidth = '170px';

        const dateLabel = L.DomUtil.create('label', '', dateSection);
        dateLabel.innerHTML = 'Date:';
        dateLabel.style.display = 'block';
        dateLabel.style.marginBottom = '4px';
        dateLabel.style.fontSize = '12px';
        dateLabel.style.fontWeight = '600';
        dateLabel.style.color = 'var(--text-secondary)';

        const dateSelect = L.DomUtil.create(
          'select',
          'date-select',
          dateSection
        );
        dateSelect.style.width = '100%';
        dateSelect.style.padding = '4px';
        dateSelect.style.border = '1px solid #ccc';
        dateSelect.style.borderRadius = '4px';
        dateSelect.style.fontSize = '12px';
        dateSelect.style.fontFamily = 'inherit';

        dateSelect.addEventListener('change', (e) => {
          this.selectedDateId = (e.target as HTMLSelectElement).value;
          this.onDateSelectionChange();
        });

        // Image Type Section
        const imageTypeSection = L.DomUtil.create(
          'div',
          'image-type-section',
          div
        );
        imageTypeSection.style.flex = '1';
        imageTypeSection.style.minWidth = '150px';

        const imageTypeLabel = L.DomUtil.create('label', '', imageTypeSection);
        imageTypeLabel.innerHTML = 'Karten Type:';
        imageTypeLabel.style.display = 'block';
        imageTypeLabel.style.marginBottom = '4px';
        imageTypeLabel.style.fontSize = '12px';
        imageTypeLabel.style.fontWeight = '600';
        imageTypeLabel.style.color = 'var(--text-secondary)';

        const imageTypeSelect = L.DomUtil.create(
          'select',
          'image-type-select',
          imageTypeSection
        );
        imageTypeSelect.style.width = '100%';
        imageTypeSelect.style.padding = '4px';
        imageTypeSelect.style.border = '1px solid #ccc';
        imageTypeSelect.style.borderRadius = '4px';
        imageTypeSelect.style.fontSize = '12px';
        imageTypeSelect.style.fontFamily = 'inherit';

        imageTypeSelect.addEventListener('change', (e) => {
          this.selectedImageType = (e.target as HTMLSelectElement).value;
          this.fetchImageData();
        });

        // Prevent map drag when interacting with control
        L.DomEvent.disableClickPropagation(div);

        // Store references to the control elements for later updates
        this.imageTypeControlDiv = div;
        this.imageTypeSelect = imageTypeSelect;
        this.dateControlDiv = div; // Same div contains both controls
        this.dateSelect = dateSelect;

        return div;
      },
      onRemove: (map: L.Map) => {},
    });

    this.map.addControl(new ImageTypeAndDateControl({ position: 'topleft' }));

    // Add Histogram Control
    const HistogramControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create(
          'div',
          'leaflet-control histogram-control'
        );
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '8px';
        div.style.padding = '0';
        div.style.display = 'none'; // Initially hidden
        div.style.minWidth = '370px';
        div.style.maxWidth = '400px';
        div.style.fontFamily = 'inherit';

        // Header with title and collapse button
        const header = L.DomUtil.create('div', 'histogram-header', div);
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '12px 16px';
        header.style.borderBottom = '1px solid #e0e0e0';
        header.style.backgroundColor = '#f8f9fa';
        header.style.borderRadius = '6px 6px 0 0';

        const title = L.DomUtil.create('h4', 'histogram-title', header);
        title.innerHTML = 'Statistics & Histogram';
        title.style.margin = '0';
        title.style.fontSize = '14px';
        title.style.fontWeight = '600';
        title.style.color = 'var(--text-primary)';

        const collapseBtn = L.DomUtil.create(
          'button',
          'histogram-collapse-btn',
          header
        );
        collapseBtn.innerHTML = '−';
        collapseBtn.style.background = 'none';
        collapseBtn.style.border = 'none';
        collapseBtn.style.fontSize = '18px';
        collapseBtn.style.fontWeight = 'bold';
        collapseBtn.style.cursor = 'pointer';
        collapseBtn.style.color = 'var(--text-secondary)';
        collapseBtn.style.padding = '0';
        collapseBtn.style.width = '20px';
        collapseBtn.style.height = '20px';
        collapseBtn.style.display = 'flex';
        collapseBtn.style.alignItems = 'center';
        collapseBtn.style.justifyContent = 'center';

        // Content container
        const content = L.DomUtil.create('div', 'histogram-content', div);
        content.style.padding = '16px';

        // Statistics section
        const statsDiv = L.DomUtil.create('div', 'histogram-stats', content);
        statsDiv.style.marginBottom = '16px';
        statsDiv.style.display = 'grid';
        statsDiv.style.gridTemplateColumns = 'repeat(3, 1fr)';
        statsDiv.style.gap = '8px';

        // Chart container
        const chartContainer = L.DomUtil.create(
          'div',
          'histogram-chart-container',
          content
        );
        chartContainer.style.position = 'relative';
        chartContainer.style.height = '200px';
        chartContainer.style.marginBottom = '8px';

        const canvas = L.DomUtil.create(
          'canvas',
          'histogram-chart',
          chartContainer
        );
        canvas.style.maxHeight = '200px';

        // Collapse functionality
        collapseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleHistogramCollapse();
        });

        // Prevent map drag when interacting with control
        L.DomEvent.disableClickPropagation(div);

        // Store reference to the control for later updates
        this.histogramControlDiv = div;

        return div;
      },
      onRemove: (map: L.Map) => {},
    });

    this.map.addControl(new HistogramControl({ position: 'topleft' }));

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

    // Add Analytics Modal Control (hidden by default)
    const AnalyticsModalControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create(
          'div',
          'leaflet-control analytics-modal-control'
        );
        div.style.background = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '8px';
        div.style.padding = '0';
        div.style.display = 'none';
        div.style.minWidth = '600px';
        div.style.maxWidth = '600px';
        div.style.maxHeight = '90.4vh';
        div.style.top = '-84px';
        div.style.left = '-10px';
        div.style.overflowY = 'auto';
        div.style.fontFamily = 'inherit';
        div.style.zIndex = '9999';
        div.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

        // Header
        const header = L.DomUtil.create('div', 'analytics-header', div);
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '16px 20px';
        header.style.borderBottom = '1px solid #e0e0e0';
        header.style.backgroundColor = '#f8f9fa';
        header.style.borderRadius = '6px 6px 0 0';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '10';

        const title = L.DomUtil.create('h3', 'analytics-title', header);
        title.innerHTML = 'Field Analytics Dashboard';
        title.style.margin = '0';
        title.style.fontSize = '18px';
        title.style.fontWeight = '700';
        title.style.color = '#1f2937';

        // Content container
        const content = L.DomUtil.create('div', 'analytics-content', div);
        content.style.padding = '20px';
        content.style.minHeight = '400px';

        // Chart 1 container
        const chart1Container = L.DomUtil.create(
          'div',
          'analytics-chart-container',
          content
        );
        chart1Container.style.position = 'relative';
        chart1Container.style.height = '320px';
        chart1Container.style.marginBottom = '24px';
        chart1Container.style.background =
          'linear-gradient(to right bottom, #ffffff, #f8fafc)';
        chart1Container.style.border = '1px solid #e2e8f0';
        chart1Container.style.borderRadius = '16px';
        chart1Container.style.padding = '20px';
        chart1Container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
        chart1Container.style.transition = 'all 0.3s ease';
        chart1Container.style.cursor = 'pointer';
        chart1Container.addEventListener('mouseover', () => {
          chart1Container.style.transform = 'translateY(-2px)';
          chart1Container.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        });
        chart1Container.addEventListener('mouseout', () => {
          chart1Container.style.transform = 'translateY(0)';
          chart1Container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
        });

        const canvas1 = L.DomUtil.create(
          'canvas',
          'analytics-chart',
          chart1Container
        );
        canvas1.style.maxHeight = '280px';
        canvas1.style.width = '100%';
        canvas1.style.height = '280px';

        // Chart 2 container (stacked bar)
        const chart2Container = L.DomUtil.create(
          'div',
          'analytics-chart2-container',
          content
        );
        chart2Container.style.position = 'relative';
        chart2Container.style.height = '420px';
        chart2Container.style.marginBottom = '24px';
        chart2Container.style.background =
          'linear-gradient(135deg, #f7fee7, #ecfccb)';
        chart2Container.style.border = '1px solid #bef264';
        chart2Container.style.borderRadius = '16px';
        chart2Container.style.padding = '20px';
        chart2Container.style.boxShadow = '0 2px 4px rgba(163, 230, 53, 0.1)';
        chart2Container.style.transition = 'all 0.3s ease';
        chart2Container.style.cursor = 'pointer';
        chart2Container.addEventListener('mouseover', () => {
          chart2Container.style.transform = 'translateY(-2px)';
          chart2Container.style.boxShadow =
            '0 4px 6px rgba(163, 230, 53, 0.15)';
        });
        chart2Container.addEventListener('mouseout', () => {
          chart2Container.style.transform = 'translateY(0)';
          chart2Container.style.boxShadow = '0 2px 4px rgba(163, 230, 53, 0.1)';
        });

        const canvas2 = L.DomUtil.create(
          'canvas',
          'analytics-stacked-bar',
          chart2Container
        );
        canvas2.style.maxHeight = '380px';
        canvas2.style.width = '100%';
        canvas2.style.height = '380px';

        // Add chart titles with icons
        const chart1Title = L.DomUtil.create(
          'div',
          'chart-title',
          chart1Container
        );
        chart1Title.style.marginBottom = '16px';
        chart1Title.style.display = 'flex';
        chart1Title.style.alignItems = 'center';
        chart1Title.style.gap = '8px';
        // chart1Title.innerHTML = `
        //   <span style="font-size: 20px;">📈</span>
        //   <span style="
        //     font-size: 16px;
        //     font-weight: 600;
        //     color: #1f2937;
        //   ">Mean NDVI Value Over Time</span>
        // `;

        const chart2Title = L.DomUtil.create(
          'div',
          'chart-title',
          chart2Container
        );
        chart2Title.style.marginBottom = '16px';
        chart2Title.style.display = 'flex';
        chart2Title.style.alignItems = 'center';
        chart2Title.style.gap = '8px';
        // chart2Title.innerHTML = `
        //   <span style="font-size: 20px;">📊</span>
        //   <span style="
        //     font-size: 16px;
        //     font-weight: 600;
        //     color: #1f2937;
        //   ">Vegetation Health Status by Date</span>
        // `;

        // Prevent all map interactions when interacting with the modal
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'DOMMouseScroll', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'wheel', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'mousedown', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'mouseup', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'mousemove', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'touchstart', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'touchend', L.DomEvent.stopPropagation);
        L.DomEvent.on(div, 'touchmove', L.DomEvent.stopPropagation);

        // Store reference
        this.analyticsModalDiv = div;
        return div;
      },
      onRemove: (map: L.Map) => {},
    });

    this.map.addControl(new AnalyticsModalControl({ position: 'topleft' }));

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
    // Complete cleanup before drawing new polygon
    this.resetMapState();

    this.seasonFieldInfo = null;
    this.showNDVI = false;
    this.imageUrl = '';
    this.imageData = null;
    this.selectedImageType = 'NDVI';
    this.ImageSensorId = '';
    this.mapsArray = [];
    this.ndviData = null;
    this.histogramData = null;
    this.selectedDate = '';
    this.selectedDateId = '';
    this.availableDates = [];

    if (this.ndviControlButton) {
      this.ndviControlButton.innerHTML = 'Show Maps';
    }

    // Hide image type control when drawing new polygon
    if (this.imageTypeControlDiv) {
      this.imageTypeControlDiv.style.display = 'none';
    }

    this.setLoading(true);
    this.showStatus('Fetching field data...', 'info');

    this.mapApiService
      .fetchFieldData(lng, lat)
      .then((geojson) => {
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

        // Show NDVI/Analytics control when polygon is drawn
        this.updateNDVIAnalyticsControlVisibility();

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
    this.mapApiService
      .fetchSeasonFields(fieldId)
      .then((result) => {
        this.seasonFieldInfo = result;
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
      this.hideHistogramControl();
      if (this.polygonLayer) {
        this.polygonLayer.setStyle({
          fillOpacity: 0.3,
        });
      }
    }
    if (this.ndviControlButton) {
      this.ndviControlButton.innerHTML = this.showNDVI
        ? 'Hide Maps'
        : 'Show Maps';
    }
    // Update button enabled/disabled state
    this.updateNDVIAnalyticsControlVisibility();
    // Hide analytics modal if toggling NDVI on
    if (this.showNDVI && this.analyticsModalDiv) {
      this.analyticsModalDiv.style.display = 'none';
      this.showAnalytics = false;
    }
  }

  private fetchSensorInfo(): void {
    this.setLoading(true);
    this.showStatus('Fetching sensor data...', 'info');

    this.mapApiService
      .fetchSensorInfo(this.selectedImageType)
      .then((result) => {
        this.ndviData = result;

        // Extract ImageSensorId, maps array, and available dates from the response
        if (result && Array.isArray(result) && result.length > 0) {
          this.populateAvailableDates(result);
          const firstItem = this.availableDates[0];
          if (firstItem) {
            this.ImageSensorId = firstItem.imageSensorId;
            this.selectedDate = firstItem.date;
            this.selectedDateId = firstItem.uniqueId;
            this.mapsArray = firstItem.imageTypesArray;
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
        console.error('Error fetching sensor data:', error);
        this.showStatus('Error loading sensor data', 'error');
        this.setLoading(false);
      });
  }

  private populateAvailableDates(result: any): void {
    // Extract available dates from all items in the response
    this.availableDates = result.map((item: any) => ({
      date: item.image.date.split('T')[0], // Extract date part (YYYY-MM-DD)
      sensor: item.image.sensor.replace('_', ' '), // Format sensor name
      fullDate: item.image.date,
      imageSensorId: item.image.id,
      imageTypesArray: item.maps,
      uniqueId: item.image.date.split('T')[0] + '#' + item.image.id,
    }));

    // Remove duplicates based on date and sort by date (newest first)
    this.availableDates = this.availableDates
      .filter(
        (date, index, self) =>
          index ===
          self.findIndex(
            (d) => d.date === date.date && d.sensor === date.sensor
          )
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Populate date control (no need to show separately since it's the same div)
    this.populateDateControl();
  }

  private fetchImageData(): void {
    if (!this.seasonFieldInfo || !this.seasonFieldInfo.id) {
      this.showStatus('Season field information not available', 'error');
      return;
    }

    this.setLoading(true);
    this.showStatus('Fetching map data...', 'info');

    this.mapApiService
      .fetchImageData(
        this.ImageSensorId,
        this.seasonFieldInfo.id,
        this.selectedImageType
      )
      .then((result) => {
        this.imageData = result;

        // Extract image URL and histogram data from the response
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
            }

            // Store histogram data
            if (firstMap.histogram) {
              this.histogramData = firstMap;
            }
          }

          // Also check for legend data as fallback
          if (!this.histogramData && firstResult.legend) {
            this.histogramData = firstResult;
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

    // Show and update histogram control
    if (this.histogramData && this.showNDVI) {
      this.showHistogramControl();
      this.updateHistogramControl();
    }

    this.showStatus(`${this.selectedImageType} overlay added`, 'success');
  }

  private removeNDVIOverlay(): void {
    if (this.ndviLayer) {
      this.map.removeLayer(this.ndviLayer);
      this.ndviLayer = null;
    }

    // Force remove all image overlays (in case there are orphaned layers)
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.ImageOverlay) {
        this.map.removeLayer(layer);
      }
    });

    this.imageUrl = ''; // Clear image URL

    // Hide histogram control
    this.hideHistogramControl();

    // Restore polygon fill opacity when hiding image overlay
    if (this.polygonLayer) {
      this.polygonLayer.setStyle({
        fillOpacity: 0.3,
      });
    }

    this.showStatus(`${this.selectedImageType} overlay removed`, 'info');
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
      this.imageTypeControlDiv.style.display = 'flex';
    }
  }

  private populateDateControl(): void {
    if (this.dateSelect && this.availableDates.length > 0) {
      // Clear existing options
      this.dateSelect.innerHTML = '';

      // Add options from available dates
      this.availableDates.forEach((dateItem) => {
        const option = document.createElement('option');
        option.value = dateItem.uniqueId;
        option.textContent = `${dateItem.date} (${dateItem.sensor})`;

        // Select the first date by default if no date is selected
        if (
          !this.selectedDateId &&
          this.availableDates.indexOf(dateItem) === 0
        ) {
          option.selected = true;
          this.selectedDateId = dateItem.uniqueId;
          this.selectedDate = dateItem.date;
        } else if (dateItem.selectedDateId === this.selectedDateId) {
          option.selected = true;
        }

        this.dateSelect!.appendChild(option);
      });
    }
  }

  private showDateControl(): void {
    if (this.dateControlDiv) {
      this.dateControlDiv.style.display = 'flex';
    }
  }

  private onDateSelectionChange(): void {
    const selectedDateItem = this.availableDates.find(
      (item) => item.uniqueId === this.selectedDateId
    );
    if (selectedDateItem) {
      this.ImageSensorId = selectedDateItem.imageSensorId;
      this.mapsArray = selectedDateItem.imageTypesArray;
      this.selectedDate = selectedDateItem.date;
      this.populateImageTypeControl();
    }
    this.fetchImageData();
  }

  private resetMapState(): void {
    // Force remove any existing image overlay
    if (this.ndviLayer) {
      this.map.removeLayer(this.ndviLayer);
      this.ndviLayer = null;
    }

    // Force remove all image overlays from the map (in case there are orphaned layers)
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.ImageOverlay) {
        this.map.removeLayer(layer);
      }
    });

    // Remove any existing polygon and reset its state
    if (this.polygonLayer) {
      this.map.removeLayer(this.polygonLayer);
      this.polygonLayer = null;
    }

    // Clear histogram data and destroy chart
    this.histogramData = null;
    if (this.histogramChart) {
      this.histogramChart.destroy();
      this.histogramChart = null;
    }

    // Hide controls
    if (this.ndviControlDiv) {
      this.ndviControlDiv.style.display = 'none';
    }

    if (this.imageTypeControlDiv) {
      this.imageTypeControlDiv.style.display = 'none';
    }

    if (this.histogramControlDiv) {
      this.histogramControlDiv.style.display = 'none';
    }

    if (this.analyticsModalDiv) {
      this.analyticsModalDiv.style.display = 'none';
    }

    // Clear any existing popups
    this.map.closePopup();
    // Hide NDVI/Analytics control when no polygon
    this.updateNDVIAnalyticsControlVisibility();
  }

  private toggleHistogramCollapse(): void {
    if (!this.histogramControlDiv) return;

    const content = this.histogramControlDiv.querySelector(
      '.histogram-content'
    ) as HTMLDivElement;
    const collapseBtn = this.histogramControlDiv.querySelector(
      '.histogram-collapse-btn'
    ) as HTMLButtonElement;

    this.histogramCollapsed = !this.histogramCollapsed;

    if (this.histogramCollapsed) {
      content.style.display = 'none';
      collapseBtn.innerHTML = '+';
    } else {
      content.style.display = 'block';
      collapseBtn.innerHTML = '−';
    }
  }

  private updateHistogramControl(): void {
    if (!this.histogramControlDiv || !this.histogramData) return;

    const statsDiv = this.histogramControlDiv.querySelector(
      '.histogram-stats'
    ) as HTMLDivElement;
    const canvas = this.histogramControlDiv.querySelector(
      '.histogram-chart'
    ) as HTMLCanvasElement;

    // Clear existing stats
    statsDiv.innerHTML = '';

    // Update statistics
    const stats =
      this.histogramData.histogram || this.histogramData.legend?.stat;
    if (stats) {
      this.createStatisticItem(
        statsDiv,
        'Min',
        stats.min,
        this.selectedImageType
      );
      this.createStatisticItem(
        statsDiv,
        'Mean',
        stats.mean,
        this.selectedImageType
      );
      this.createStatisticItem(
        statsDiv,
        'Max',
        stats.max,
        this.selectedImageType
      );
    }

    // Update histogram chart
    this.createHistogramChart(canvas);
  }

  private createStatisticItem(
    container: HTMLDivElement,
    label: string,
    value: number,
    type: string
  ): void {
    const item = L.DomUtil.create('div', 'stat-item', container);
    item.style.textAlign = 'center';
    item.style.padding = '8px';
    item.style.backgroundColor = '#f8f9fa';
    item.style.borderRadius = '4px';
    item.style.border = '1px solid #e0e0e0';

    const labelEl = L.DomUtil.create('div', 'stat-label', item);
    labelEl.innerHTML = `${label} ${type}`;
    labelEl.style.fontSize = '11px';
    labelEl.style.fontWeight = '600';
    labelEl.style.color = 'var(--text-secondary)';
    labelEl.style.marginBottom = '4px';

    const valueEl = L.DomUtil.create('div', 'stat-value', item);
    valueEl.innerHTML = value.toFixed(4);
    valueEl.style.fontSize = '13px';
    valueEl.style.fontWeight = '700';
    valueEl.style.color = 'var(--text-primary)';
  }

  private createHistogramChart(canvas: HTMLCanvasElement): void {
    if (!this.histogramData || !this.histogramData.histogram) return;

    // Destroy existing chart if it exists
    if (this.histogramChart) {
      this.histogramChart.destroy();
    }

    const histogram = this.histogramData.histogram;
    const items = histogram.items || [];

    // Prepare data for Chart.js
    const labels = items.map(
      (item: any) => `${item.valueMin.toFixed(2)} - ${item.valueMax.toFixed(2)}`
    );
    const data = items.map((item: any) => item.area || item.numberOfPixel);
    const backgroundColors = items.map(
      (item: any) =>
        `rgba(${item.color.r}, ${item.color.g}, ${item.color.b}, 0.8)`
    );
    const borderColors = items.map(
      (item: any) =>
        `rgba(${item.color.r}, ${item.color.g}, ${item.color.b}, 1)`
    );

    // Calculate total area for percentage calculation
    const totalArea = items.reduce(
      (sum: number, item: any) => sum + item.area,
      0
    );

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Area (ha)',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            maxBarThickness: 30,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                const item = items[context[0].dataIndex];
                return `${this.selectedImageType}: ${item.valueMin.toFixed(
                  3
                )} - ${item.valueMax.toFixed(3)}`;
              },
              label: (context) => {
                const item = items[context.dataIndex];
                const percentage =
                  totalArea > 0 ? (item.area / totalArea) * 100 : 0;
                return [
                  `Area: ${item.area.toFixed(4)} ha`,
                  `Percentage: ${percentage.toFixed(2)}%`,
                  `Pixels: ${item.numberOfPixel.toLocaleString()}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: `${this.selectedImageType} Value Range`,
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 9,
              },
            },
          },
          y: {
            title: {
              display: true,
              text: 'Area (ha)',
            },
            beginAtZero: true,
            ticks: {
              font: {
                size: 10,
              },
            },
          },
        },
      },
    };

    this.histogramChart = new Chart(canvas, config);
  }

  private showHistogramControl(): void {
    if (this.histogramControlDiv) {
      this.histogramControlDiv.style.display = 'block';
    }
  }

  private hideHistogramControl(): void {
    if (this.histogramControlDiv) {
      this.histogramControlDiv.style.display = 'none';
    }
  }

  toggleAnalytics(): void {
    if (!this.polygonLayer) return;
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics) {
      if (this.imageTypeControlDiv)
        this.imageTypeControlDiv.style.display = 'none';
      if (this.histogramControlDiv)
        this.histogramControlDiv.style.display = 'none';
      if (this.analyticsModalDiv)
        this.analyticsModalDiv.style.display = 'block';
      if (!this.ndviLayer) this.fetchSensorInfoForAnalytics();
      this.fetchAnalyticsStatusData();
    } else {
      if (this.analyticsModalDiv) this.analyticsModalDiv.style.display = 'none';
    }
    if (this.analyticsControlButton) {
      this.analyticsControlButton.innerHTML = this.showAnalytics
        ? 'Hide Analytics'
        : 'Show Analytics';
    }
    if (this.ndviControlButton) {
      this.ndviControlButton.innerHTML = 'Show Maps';
    }
    if (this.showAnalytics) this.showNDVI = false;
    this.updateNDVIAnalyticsControlVisibility();
    if (this.showAnalytics && this.histogramControlDiv) {
      this.histogramControlDiv.style.display = 'none';
    }
  }

  private fetchSensorInfoForAnalytics(): void {
    this.setLoading(true);
    this.showStatus('Fetching sensor data...', 'info');
    this.mapApiService
      .fetchSensorInfo('NDVI')
      .then((result) => {
        this.ndviData = result;
        if (result && Array.isArray(result) && result.length > 0) {
          const firstItem = result[0];
          this.ImageSensorId = firstItem.image.id;
          this.selectedDate = firstItem.image.date.split('T')[0];
          this.selectedDateId =
            firstItem.image.date.split('T')[0] + '#' + firstItem.image.id;
          this.mapsArray = firstItem.maps;
        }
        this.showStatus('Sensor data loaded successfully', 'success');
        this.fetchImageDataForAnalytics();
        this.setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching sensor data:', error);
        this.showStatus('Error loading sensor data', 'error');
        this.setLoading(false);
      });
  }
  private fetchImageDataForAnalytics(): void {
    if (!this.seasonFieldInfo || !this.seasonFieldInfo.id) {
      this.showStatus('Season field information not available', 'error');
      return;
    }
    this.setLoading(true);
    this.showStatus('Fetching map data...', 'info');
    this.mapApiService
      .fetchImageData(this.ImageSensorId, this.seasonFieldInfo.id, 'NDVI')
      .then((result) => {
        this.imageData = result;
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
            }
          }
        }
        this.showStatus('Map data loaded successfully', 'success');
        this.addNDVIOverlay();
        this.setLoading(false);
        // Show analytics chart (placeholder)
        this.updateAnalyticsModal();
      })
      .catch((error) => {
        console.error('Error fetching map data:', error);
        this.showStatus('Error loading map data', 'error');
        this.setLoading(false);
      });
  }
  private fetchAnalyticsStatusData(): void {
    if (!this.seasonFieldInfo || !this.seasonFieldInfo.id) return;

    // Show loading state
    if (this.analyticsModalDiv) {
      const content =
        this.analyticsModalDiv.querySelector('.analytics-content');
      if (content) {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'analytics-loading-overlay';
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.background = 'rgba(255, 255, 255, 0.9)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.flexDirection = 'column';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.zIndex = '100';
        loadingOverlay.style.backdropFilter = 'blur(4px)';

        // Create spinner
        const spinner = document.createElement('div');
        spinner.style.width = '40px';
        spinner.style.height = '40px';
        spinner.style.border = '3px solid #e2e8f0';
        spinner.style.borderTop = '3px solid var(--primary-color)';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        spinner.style.marginBottom = '16px';

        // Add keyframes for spinner animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);

        // Loading text
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Loading analytics data...';
        loadingText.style.color = '#1f2937';
        loadingText.style.fontSize = '14px';
        loadingText.style.fontWeight = '500';
        loadingText.style.marginTop = '8px';

        loadingOverlay.appendChild(spinner);
        loadingOverlay.appendChild(loadingText);
        content.appendChild(loadingOverlay);
      }
    }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - 3);
    const toDateStr = toDate.toISOString().split('T')[0];
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const resp = this.mapApiService.responseData;
    this.analyticsStatus = resp.status;
    this.analyticsLineChartData = resp.line_chart;
    // Remove loading overlay
    if (this.analyticsModalDiv) {
      const loadingOverlay = this.analyticsModalDiv.querySelector(
        '.analytics-loading-overlay'
      );
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }
    this.updateAnalyticsModal();

    // this.mapApiService
    //   .fetchAnalyticsStatus(fromDateStr, toDateStr, this.seasonFieldInfo.id)
    //   .then((resp) => {
    //     this.analyticsStatus = resp.status;
    //     this.analyticsLineChartData = resp.line_chart;
    //     // Remove loading overlay
    //     if (this.analyticsModalDiv) {
    //       const loadingOverlay = this.analyticsModalDiv.querySelector(
    //         '.analytics-loading-overlay'
    //       );
    //       if (loadingOverlay) {
    //         loadingOverlay.remove();
    //       }
    //     }
    //     this.updateAnalyticsModal();
    //   })
    //   .catch((err) => {
    //     this.analyticsStatus = null;
    //     this.analyticsLineChartData = [];
    //     // Show error state instead of loading
    //     if (this.analyticsModalDiv) {
    //       const loadingOverlay = this.analyticsModalDiv.querySelector(
    //         '.analytics-loading-overlay'
    //       );
    //       if (loadingOverlay) {
    //         loadingOverlay.innerHTML = `
    //           <div style="
    //             text-align: center;
    //             padding: 24px;
    //             color: #991b1b;
    //             display: flex;
    //             flex-direction: column;
    //             align-items: center;
    //             gap: 12px;
    //           ">
    //             <span style="font-size: 32px;">⚠️</span>
    //             <div style="font-size: 16px; font-weight: 600;">Failed to load analytics data</div>
    //             <div style="font-size: 14px; color: #64748b;">Please try again later</div>
    //           </div>
    //         `;
    //       }
    //     }
    //     this.updateAnalyticsModal();
    //   });
  }

  private updateAnalyticsModal(): void {
    if (!this.analyticsModalDiv) return;
    // Status section
    const statusDiv = this.analyticsModalDiv.querySelector(
      '.analytics-status'
    ) as HTMLDivElement;
    if (statusDiv) statusDiv.remove();
    if (this.analyticsStatus) {
      const newStatusDiv = document.createElement('div');
      newStatusDiv.className = 'analytics-status';

      // Add a section title
      const sectionTitle = document.createElement('h4');
      sectionTitle.innerHTML = 'Field Status Overview';
      sectionTitle.style.margin = '0 0 24px 0';
      sectionTitle.style.fontSize = '20px';
      sectionTitle.style.fontWeight = '700';
      sectionTitle.style.color = '#1f2937';
      sectionTitle.style.borderBottom = '2px solid #e5e7eb';
      sectionTitle.style.paddingBottom = '12px';
      sectionTitle.style.display = 'flex';
      sectionTitle.style.alignItems = 'center';
      sectionTitle.style.gap = '8px';

      // Add icon to title
      const titleIcon = document.createElement('span');
      titleIcon.innerHTML = '📊';
      titleIcon.style.fontSize = '24px';
      sectionTitle.prepend(titleIcon);

      newStatusDiv.appendChild(sectionTitle);

      // Handle multiple cultivation timelines as badges
      let timelineBadges = '';
      if (this.analyticsStatus.cultivation_timeline) {
        const timelines = this.analyticsStatus.cultivation_timeline
          .split(',')
          .map((t: string) => t.trim());
        timelineBadges = timelines
          .map((t: string) => `<span class="timeline-badge">${t}</span>`)
          .join(' ');
      }

      const statusContent = document.createElement('div');
      statusContent.innerHTML = `
        <div class="status-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        ">
          <div class="status-card" style="
            display: flex;
            align-items: center;
            padding: 16px;
            background: linear-gradient(to right bottom, #ffffff, #f8fafc);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            cursor: pointer;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            }
          ">
            <div class="status-icon cultivation-icon" style="
              font-size: 24px;
              margin-right: 12px;
              padding: 12px;
              background: rgba(34, 197, 94, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">🌱</div>
            <div class="status-info" style="flex: 1;">
              <span class="status-label" style="
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Cultivation Timeline</span>
              <div class="status-value" style="
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
              ">${timelineBadges.replace(
                /timeline-badge/g,
                'timeline-badge" style="display: inline-block; padding: 4px 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 16px; font-size: 12px; font-weight: 500; color: #166534;'
              )}</div>
            </div>
          </div>

          <div class="status-card" style="
            display: flex;
            align-items: center;
            padding: 16px;
            background: linear-gradient(to right bottom, #ffffff, #f8fafc);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            cursor: pointer;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            }
          ">
            <div class="status-icon times-icon" style="
              font-size: 24px;
              margin-right: 12px;
              padding: 12px;
              background: rgba(99, 102, 241, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">🔄</div>
            <div class="status-info" style="flex: 1;">
              <span class="status-label" style="
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Cultivation Times</span>
              <div class="status-value status-number" style="
                font-size: 24px;
                font-weight: 700;
                color: #4f46e5;
              ">${this.analyticsStatus.cultivation_times}</div>
            </div>
          </div>

          <div class="status-card current-status-card" style="
            display: flex;
            align-items: center;
            padding: 16px;
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 1px solid #86efac;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(34, 197, 94, 0.15);
            }
          ">
            <div class="status-icon status-icon" style="
              font-size: 24px;
              margin-right: 12px;
              padding: 12px;
              background: rgba(34, 197, 94, 0.15);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">📊</div>
            <div class="status-info" style="flex: 1;">
              <span class="status-label" style="
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: #065f46;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Current Status</span>
              <div class="status-value status-highlight" style="
                font-size: 16px;
                font-weight: 700;
                color: #047857;
                padding: 4px 8px;
                background: rgba(34, 197, 94, 0.1);
                border-radius: 6px;
                display: inline-block;
              ">${this.analyticsStatus.current_status}</div>
            </div>
          </div>

          <div class="status-card" style="
            display: flex;
            align-items: center;
            padding: 16px;
            background: linear-gradient(to right bottom, #ffffff, #f8fafc);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            cursor: pointer;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            }
          ">
            <div class="status-icon harvest-icon" style="
              font-size: 24px;
              margin-right: 12px;
              padding: 12px;
              background: rgba(245, 158, 11, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">🌾</div>
            <div class="status-info" style="flex: 1;">
              <span class="status-label" style="
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Harvesting Times</span>
              <div class="status-value status-number" style="
                font-size: 24px;
                font-weight: 700;
                color: #d97706;
              ">${this.analyticsStatus.harvesting_times}</div>
            </div>
          </div>

          <div class="status-card" style="
            display: flex;
            align-items: center;
            padding: 16px;
            background: linear-gradient(to right bottom, #ffffff, #f8fafc);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            cursor: pointer;
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            }
          ">
            <div class="status-icon idle-icon" style="
              font-size: 24px;
              margin-right: 12px;
              padding: 12px;
              background: rgba(107, 114, 128, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">⏸️</div>
            <div class="status-info" style="flex: 1;">
              <span class="status-label" style="
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Idle Periods</span>
              <div class="status-value status-number" style="
                font-size: 24px;
                font-weight: 700;
                color: #4b5563;
              ">${this.analyticsStatus.idle_periods}</div>
            </div>
          </div>
        </div>
      `;
      newStatusDiv.appendChild(statusContent);
      this.analyticsModalDiv
        .querySelector('.analytics-content')
        ?.prepend(newStatusDiv);
    }
    // Sort line_chart by date ascending
    if (this.analyticsLineChartData && this.analyticsLineChartData.length > 0) {
      this.analyticsLineChartData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    // Line chart 1: Mean NDVI
    const canvas = this.analyticsModalDiv.querySelector(
      '.analytics-chart'
    ) as HTMLCanvasElement;
    if (this.analyticsChart) this.analyticsChart.destroy();
    if (this.analyticsLineChartData && this.analyticsLineChartData.length > 0) {
      const labels = this.analyticsLineChartData.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-GB', {
          month: 'short',
          day: '2-digit',
          year: '2-digit',
        });
      });
      const data = this.analyticsLineChartData.map((d) => d.mean_ndvi);
      this.analyticsChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Mean NDVI',
              data: data,
              borderColor: 'rgba(34,197,94,1)',
              backgroundColor: 'rgba(34,197,94,0.15)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgba(34,197,94,1)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
            title: {
              display: true,
              text: 'Mean NDVI Value Over Time',
              font: { size: 16, weight: 'bold' },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `Mean NDVI: ${ctx.parsed.y.toFixed(4)}`,
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: 'Date' },
              ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
              grid: { display: false },
            },
            y: {
              title: { display: true, text: 'Mean NDVI Value' },
              beginAtZero: true,
              min: 0,
              max: 1,
              grid: { color: '#e0e0e0' },
              ticks: { font: { size: 10 } },
            },
          },
        },
      });
    }
    // Remove old chart2 logic and add stacked bar chart for vegetation status
    let stackedBarCanvas = this.analyticsModalDiv.querySelector(
      '.analytics-stacked-bar'
    ) as HTMLCanvasElement;
    if (!stackedBarCanvas) {
      // Create the stacked bar canvas if not present
      const chartContainer =
        this.analyticsModalDiv.querySelector('.analytics-content');
      stackedBarCanvas = document.createElement('canvas');
      stackedBarCanvas.className = 'analytics-stacked-bar';
      chartContainer?.appendChild(stackedBarCanvas);
    }
    if (this.analyticsChart2) this.analyticsChart2.destroy();
    if (this.analyticsLineChartData && this.analyticsLineChartData.length > 0) {
      // Prepare data for stacked bar chart
      const labels = this.analyticsLineChartData.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-GB', {
          month: 'short',
          day: '2-digit',
          year: '2-digit',
        });
      });
      const categories = ['Poor', 'Moderate', 'Good', 'Excellent'];
      const colors = {
        Poor: '#991b1b', // dark red
        Moderate: '#fbbf24', // yellow
        Good: '#a3e635', // light green
        Excellent: '#065f46', // dark green
      };
      const dataByCategory: Record<string, number[]> = {
        Poor: [],
        Moderate: [],
        Good: [],
        Excellent: [],
      };
      this.analyticsLineChartData.forEach((d) => {
        categories.forEach((cat) => {
          const val =
            d.category_percentages && d.category_percentages[cat]
              ? d.category_percentages[cat]
              : 0;
          dataByCategory[cat].push(val);
        });
      });
      this.analyticsChart2 = new Chart(stackedBarCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: categories.map((cat) => ({
            label: cat,
            data: dataByCategory[cat],
            backgroundColor: colors[cat as keyof typeof colors],
            borderWidth: 1,
            borderColor: '#fff',
            stack: 'NDVI',
            barPercentage: 0.8,
            categoryPercentage: 0.9,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { boxWidth: 18, font: { size: 13 } },
            },
            title: {
              display: true,
              text: 'Vegetation Health Status by Date',
              font: { size: 16, weight: 'bold' },
            },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              title: { display: true, text: 'Date' },
              ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
              grid: { display: false },
            },
            y: {
              stacked: true,
              title: { display: true, text: 'Percentage of Field (%)' },
              min: 0,
              max: 100,
              grid: { color: '#e0e0e0' },
              ticks: { font: { size: 10 }, callback: (v) => `${v}%` },
            },
          },
        },
      });
    }
  }

  private updateNDVIAnalyticsControlVisibility(): void {
    if (this.ndviControlDiv) {
      this.ndviControlDiv.style.display = this.polygonLayer ? 'flex' : 'none';
    }
    // Also update button enabled/disabled state
    if (this.ndviControlButton) {
      this.ndviControlButton.disabled = !!this.showAnalytics;
    }
    if (this.analyticsControlButton) {
      this.analyticsControlButton.disabled = !!this.showNDVI;
    }
  }
}
