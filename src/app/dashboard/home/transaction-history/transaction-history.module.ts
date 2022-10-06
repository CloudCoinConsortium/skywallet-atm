import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionHistoryRoutingModule } from './transaction-history-routing.module';
import { TransactionHistoryComponent } from './transaction-history.component';


@NgModule({
  declarations: [TransactionHistoryComponent],
  imports: [
    CommonModule,
    TransactionHistoryRoutingModule
  ]
})
export class TransactionHistoryModule { }
