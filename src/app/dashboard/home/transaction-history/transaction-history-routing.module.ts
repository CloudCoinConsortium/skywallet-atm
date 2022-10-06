import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TransactionHistoryComponent } from './transaction-history.component';

const routes: Routes = [
  {
    path: '',
    component: TransactionHistoryComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TransactionHistoryRoutingModule { }
