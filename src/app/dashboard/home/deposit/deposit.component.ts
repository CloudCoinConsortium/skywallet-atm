import {Component, OnInit} from '@angular/core';
import {LoginService} from '../../../service/login.service';
import {Router} from '@angular/router';
import {RaidaServiceService} from '../../../raida-service.service';
import {AnimationOptions} from 'ngx-lottie';
import {AnimationItem} from 'lottie-web';

@Component({
  selector: 'app-deposit',
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.scss']
})
export class DepositComponent implements OnInit {

  files: File[] = [];
  private token: any = null;
  errorMessage: string = null;
  options: AnimationOptions = {
    path: '/assets/animations/cloud_upload.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  showNormal = true;
  showError = false;
  complete = false;
  completeMessage: string = null;
  progressMessage = 'Depositing..';
  queueLength = 0;
  queueIndexStart = 0;
  queueIndexEnd = 0;
  requestCounter = 0;
  responsecounter = 0;
  completeCallBack = false;
  private responseArray = [];
  private ccCheck = [];

  onSelect(event): void {
    this.files.push(...event.addedFiles);
    if (!this.auth.getLoggedIn())
    {
      this.auth.checkLoginStatus();
      this.router.navigate(['welcome']);
    }
    else {
      this.token = this.auth.getToken();
      this.checkFileDenominations();
    }
  }

  onRemove(event): void {
    this.files.splice(this.files.indexOf(event), 1);
  }

  constructor(private  auth: LoginService, private router: Router, private raida: RaidaServiceService) {

  }

  ngOnInit(): void {
    if (!this.auth.getLoggedIn())
    {
      this.auth.checkLoginStatus();
      this.router.navigate(['/welcome']);
    }
    this.auth.watch().subscribe((value) => {
      if (!value) {
        this.router.navigate(['/welcome']);
      }
    });

  }
  checkFileDenominations(): void {
    const me = this;
    let total = 0;
    let depositStack = [];
    let checked = 0;

    for (const thisFile of Object.values( this.files))
    {
      const reader = new FileReader();
      reader.readAsText(thisFile);
      reader.onload = function() {
        let coin = null;
        checked ++;
        try {
          coin = JSON.parse(reader.result.toString());
          let stack = coin.cloudcoin;
          if(stack === null)
            stack = coin.cloudCoin;

          for (let i = 0; i < stack.length; i++) {
            const cc = stack[i];
            if (me.ccCheck.indexOf(cc.sn) !== -1)
            {
               total = 0;
               depositStack = [];
               checked = 0;
               me.ccCheck = [];
               me.files = [];
               me.showErrorMessage('Duplicate coin with serial number: ' + cc.sn + ' within selected files. Please ' +
                're-attach coins, and attach a coin only once.');
               return;
            }
            else
            {
              me.ccCheck.push(cc.sn);
            }
            depositStack.push(cc);
            total += me.raida.getDenomination(cc.sn);
          }
          if (checked >= me.files.length)
          {
            me.processCoins(total, depositStack);
          }
        } catch (e) {
          console.log(e);
          me.showErrorMessage('Failed to parse CloudCoin');
          return;
        }
        if (!('cloudcoin' in coin)) {
          me.showErrorMessage('Failed to parse CloudCoin');
          return;
        }
      };
      reader.onerror = function(error) {
        console.log('Error: ', error);
        checked ++;
        me.showErrorMessage('Unable to parse CloudCoin File');
      };

    }
  }

  async processCoins(total, depositStack): Promise<void> {
    this.completeCallBack = false; // to ensure final callback is called once.
    if (total === 0 || depositStack.length === 0) {
      return;
    }

    let depositStackParam = [];
    const queueLength = Math.ceil(depositStack.length / 400);
    if (queueLength === 1) {
      depositStackParam = depositStack;
    }
    /*if (depositStack.length > 400) {
      this.showErrorMessage('Please deposit only 400 coins maximum at a time');
      return;
    }*/
    this.requestCounter = 0;
    this.responsecounter = 0;
    this.responseArray = [];
    this.ccCheck = [];
    for (let i = 0; i < queueLength; i++) {
      const startIndex = i * 400;
      const endIndex = startIndex + 400; // because slice ignores last element
      depositStackParam = depositStack.slice(startIndex, endIndex);
      const params = {
        to: this.token.sn,
        memo: 'Deposit by #' + this.token.sn,
        coins: depositStackParam

      };
      this.responseArray[i] = { authentic: 0, counterfeit: 0, error: 0, fracked: 0, total: depositStackParam.length,
        coins: depositStackParam,
        errorMessage: ''};
      this.showLoading(true);
      this.files = [];
      this.progressMessage = 'Depositing Group ' + (i + 1) + '/' + queueLength + ' - Do not close  your browser or browse away';
      await this.sleep(50);
      this.requestCounter++;
      this.raida.apiDetect(params.coins).then(response => {
        this.responsecounter++;
        if (response.status !== 'done') {
          this.responseArray[i].errorMessage = 'Failed to Detect Authenticity of  Coins';
          this.responseArray[i].counterfeit = params.coins.length;
          return;
        }
        this.progressMessage = 'Depositing Group ' + (i + 1) + '/' + queueLength + 'Detecting Authenticity - Do not close  your browser or browse away';
        this.raida.fixFracked(response.result).then(frackedResponse => {

          this.progressMessage = 'Depositing Group ' + (i + 1) + '/' + queueLength + ' Fixing Fracked Coins - Do not close  your browser or browse away';
          if (frackedResponse.fixedNotes > 0) {
            this.progressMessage = 'Depositing Group ' + (i + 1) + '/' + queueLength + ' Fixed ' + frackedResponse.fixedNotes + ' Fracked Coins - Do not close  your browser or browse away ';
          }
          this.performDeposit(params, queueLength, i);

        }).catch(error => {

          this.performDeposit(params, queueLength, i);
        });
      }).catch(error => {
        this.responsecounter++;
        this.responseArray[i].errorMessage = error.toString();
        this.responseArray[i].error = params.coins.length;
        if(this.responsecounter >= this.requestCounter && !this.completeCallBack)
        {
          this.completeCallBack = true;
          this.completedProcessing();
          return;
        }
      });

    }

  }
  performDeposit(params, queueLength, i): void
  {
    this.raida.depositLocal(params).then(depositResponse => {
      this.progressMessage = 'Depositing Group ' + (i + 1) + '/' + queueLength + ' Do not close  your browser or browse away';
      const validCoins = depositResponse.authenticNotes + depositResponse.frackedNotes;
      this.responseArray[i].authentic = depositResponse.authenticNotes;
      this.responseArray[i].fracked = depositResponse.frackedNotes;
      this.responseArray[i].counterfeit = depositResponse.counterfeitNotes;
      this.responseArray[i].error = depositResponse.errorNotes;
      this.responsecounter++;
      if(this.responsecounter >= this.requestCounter && !this.completeCallBack)
      {
        this.completeCallBack = true;
        this.completedProcessing();
      }
    });
  }

  completedProcessing(): void{
    let hasError = false;
    let authentic = 0;
    let total = 0;
    let error = 0;
    let counterfeit = 0;
    let fracked = 0;
    for (const response of this.responseArray)
    {
      if(response.error > 0 || response.counterfeit > 0)
      {
        hasError = true;
      }
      authentic = authentic + response.authentic;
      error = error + response.error;
      fracked = fracked + response.fracked;
      total = total + response.total;
      counterfeit = counterfeit + response.counterfeit;
    }
    if (authentic + fracked === 0 )
    {
      this.showErrorMessage('No coins were deposited. Total Coins: ' + total + ', Counterfeit coins: ' + counterfeit
        + ', Deposit Errors: ' + error);
      this.completeCallBack = false;
      return;
    }
    else
    {
      if (!hasError)
      {
        this.showCompleteMessage('<fa-icon icon="check"></fa-icon>  Deposit Complete, ' + total + ' notes deposited');
        setTimeout(() => {
          this.router.navigate(['/balance']);
        }, 3000);
      }
      else {
        this.showCompleteMessage('Deposit Complete.' +
          '<ul class="fa-ul depositResponse">' +
          '<li><span class="fa-li"><i class="fas fa-coins"></i></span> Total Coins: ' + total + '</li>' +
          '<li><span class="fa-li"><i class="fas fa-check"></i></span> Deposited Coins: ' + (authentic + fracked) + '</li>' +
          '<li><span class="fa-li"><i class="fas fa-check"></i></span> Authentic coins: ' + authentic + '</li>' +
          '<li><span class="fa-li"><i class="fas fa-exclamation-circle"></i></span> Fracked coins: ' + fracked + '</li>' +
          '<li><span class="fa-li"><i class="fas fa-exclamation-triangle"></i></span> Counterfeit coins: ' + counterfeit + '</li>' +
          '<li><span class="fa-li"><i class="fas fa-bug"></i></span> Deposit Errors: ' + error + '</li>' +
            '</ul>');
        // this.showErrorMessage('Only ' + authentic + 'from ' + total + ' Notes Were Deposited');
        this.completeCallBack = false;
        return;
        /*setTimeout(() => {
          this.router.navigate(['/balance']);
        }, 3000);*/
      }
    }
  }
  sleep(ms): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  animationCreated(animationItem: AnimationItem): void {
    console.log(animationItem);
  }
  showCompleteMessage(message): void
  {
    this.completeMessage = message;
    this.complete = true;
    this.showError = false;
    this.showNormal = false;
    this.showLoader = false;
  }

  showLoading(state): void {
    if (state)
    {
      this.showNormal = false;
      this.showLoader = true;
      this.showError = false;
    }
    else
    {
      this.showNormal = true;
      this.showLoader = false;
      this.showError = false;
    }

  }

  showErrorMessage(message): void {
    this.errorMessage = message;
    this.showNormal = false;
    this.showError = true;
    this.showLoader = false;


  }
  hideErrorMessage(): void {
    this.errorMessage = '';
    this.showNormal = true;
    this.showError = false;
    this.showLoader = false;
  }

}
