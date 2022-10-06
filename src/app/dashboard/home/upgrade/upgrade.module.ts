import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LottieModule } from 'ngx-lottie';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TooltipModule } from 'ng2-tooltip-directive';
import { UpgradeRoutingModule } from './upgrate-routing.module';
import { UpgradeComponent } from './upgrade.component';



@NgModule({
  declarations: [UpgradeComponent],
  imports: [
    CommonModule,
    UpgradeRoutingModule,
    FormsModule,
    LottieModule,
    FontAwesomeModule,
    TooltipModule
  ]
})
export class UpgradeModule { }
