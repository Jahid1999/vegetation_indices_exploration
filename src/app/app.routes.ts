import { Routes } from '@angular/router';
import { SingleLandComponent } from './single-land/single-land.component';
import { BboxComponent } from './bbox/bbox.component';

export const routes: Routes = [
  { path: 'single-land', component: SingleLandComponent },
  { path: 'bbox', component: BboxComponent },
  { path: '', redirectTo: 'single-land', pathMatch: 'full' },
];
