import { Routes } from '@angular/router';
import { SingleLandComponent } from './single-land/single-land.component';
import { BboxComponent } from './bbox/bbox.component';
import { CreateFieldComponent } from './create-field/create-field.component';

export const routes: Routes = [
  { path: 'single-land', component: SingleLandComponent },
  { path: 'bbox', component: BboxComponent },
  { path: 'create-field', component: CreateFieldComponent },
  { path: '', redirectTo: 'single-land', pathMatch: 'full' },
];
