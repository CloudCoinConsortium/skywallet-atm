import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { B4uComponent } from './b4u.component';

const routes: Routes = [
  {
    path: '',
    component: B4uComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class B4uRoutingModule { }
