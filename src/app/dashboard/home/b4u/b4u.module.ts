import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { B4uRoutingModule } from './b4u-routing.module';
import { B4uComponent } from './b4u.component';
import { LottieModule } from 'ngx-lottie';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import { TooltipModule } from 'ng2-tooltip-directive';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [B4uComponent],
  imports: [
    CommonModule,
    B4uRoutingModule,
    FormsModule,
    LottieModule,
    FontAwesomeModule,
    TooltipModule,
    HttpClientModule
  ]
})
export class B4uModule { }
