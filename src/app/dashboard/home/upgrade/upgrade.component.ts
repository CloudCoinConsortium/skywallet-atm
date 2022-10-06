import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AnimationItem } from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';
import { LoginService } from '../../../service/login.service';
import { Router } from '@angular/router';
import { RaidaServiceService } from '../../../raida-service.service';
import Swal from 'sweetalert2';
import { round } from 'mathjs';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/service/api.service';

@Component({
  selector: 'app-upgrade',
  templateUrl: './upgrade.component.html',
  styleUrls: ['./upgrade.component.scss']
})
export class UpgradeComponent implements OnInit, AfterViewInit {
  public baseURL = environment.base_url;
  public amount: number;
  public memo: string = null;
  public to: string = null;
  errorMessage: string = null;
  public balance = 0;
  public balanceString = '0';
  loadingOptions: AnimationOptions = {
    path: '/assets/animations/cloud_loading.json'
  };
  options: AnimationOptions = {
    path: '/assets/animations/cloud_transfer.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  balanceLoader = false;
  showNormal = true;
  showError = false;
  complete = false;
  skywallet: string = null;
  balanceBreakup: string = null;
  opinions = 0;
  public balances: any = {};
  loadingMessage = '';
  // coinBaseURL:string = "https://payment.collectiblecolors.com:8443/coins/?guid=";
  coinBaseURL: string = "https://coins.collectiblecolors.com:8443/";
  coinURL: string = "";
  totalAlert: string = '';
  conversionGuid: any;
  bankCoinCount: number = 0;
  storageAvailable: boolean = true;
  showDownload:boolean = true;
  completeMessage: string = null;

  @ViewChild('autofocus') autoFocusField: ElementRef;

  constructor(private auth: LoginService, private router: Router, private raida: RaidaServiceService, private apiService: ApiService) {
    this.to = "cloudcoin.collectiblecolors.com";
  }

  ngAfterViewInit(): void {
    if (this.autoFocusField)
      this.autoFocusField.nativeElement.focus();
  }
  ngOnInit(): void {
    if (!this.auth.getLoggedIn()) {
      this.auth.checkLoginStatus();
      this.router.navigate(['/welcome']);
    }
    this.auth.watch().subscribe((value) => {
      if (!value) {
        this.router.navigate(['/welcome']);
      }
    });

    if (localStorage.getItem('skywallet')) {
      this.skywallet = localStorage.getItem('skywallet');
    }

    this.checkCoins();
  }

  async checkCoins() {
    this.showLoadingBalance(true);
    let response: any = await this.apiService.getCloudcoinCount();
    if (response) {
      if(isNaN(response)){
        this.showErrorMessage('Sorry, we are having some temporary server issues. Please try again later.');
        this.storageAvailable = false;
        return;
      }
      else if (response > 0) {
        this.storageAvailable = true;
        this.checkBalance();
      } else {
        this.showErrorMessage('Coins cannot be upgraded at the moment due to insufficient Cloud Coins in the Bank. Please try later.');
        this.storageAvailable = false;
        return;
      }
    } else {
      this.showErrorMessage('Sorry, we are having some temporary server issues. Please try again later.');
      this.storageAvailable = false;
      return;
    }
  }

  checkBalance(): void {
    this.showLoadingBalance(true);
    if (!this.auth.getLoggedIn()) {
      this.auth.checkLoginStatus();
      this.router.navigate(['welcome']);
    } else {
      const token = this.auth.getToken();

      const params = {
        sn: token.sn,
        an: token.an
      };

      this.raida.showBalance(params).then(response => {
        this.balance = 0;
        this.opinions = 0;
        let highestOpinion = 0;
        let highestOpinionBalance = 0;
        this.balanceBreakup = '<div style="text-align: left; display: table;">Your SkyWallet is out of sync. Balance returned by RAIDA servers' +
          'are as follows: <ul style="text-align: left!important;">';
        if (response.balances) {
          this.balances = response.balances;
          for (const key in response.balances) {
            // check if the property/key is defined in the object itself, not in parent
            if (response.balances.hasOwnProperty(key)) {
              this.balanceBreakup += '<li style="text-align: left!important">' + response.balances[key] +
                ' RAIDA(s) - ' + parseInt(key).toLocaleString() + ' cc </li>';
              if (response.balances[key] > highestOpinion) {
                highestOpinion = response.balances[key];
                highestOpinionBalance = parseInt(key);
                this.balance = highestOpinionBalance;
                this.balanceString = this.balance.toLocaleString();
              }
            }
            this.opinions++;
          }
          this.balanceBreakup += '</ul> It is advised that you sync your SkyWallet by clicking the sync icon</div>';
          if (this.opinions > 1) {
            Swal.fire({
              titleText: 'Your SkyWallet is out of sync',
              text: 'It is recommended that you sync your SkyWallet, to avoid losing coins during transactions. Do you want to sync your' +
                'SkyWallet now?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes',
              cancelButtonText: 'No'
            }).then((result) => {
              if (result.value) {
                this.syncAccount();
              }
            });
          }
        }
        this.showLoadingBalance(false);

      });
    }

  }

  syncAccount(): void {
    this.showLoading(true);
    let completeCallBack = false;

    if (!this.auth.getLoggedIn()) {
      this.auth.checkLoginStatus();
      this.router.navigate(['welcome']);
    } else {
      const token = this.auth.getToken();
      this.loadingMessage = 'Synchronizing SkyWallet...';

      const params = {
        sn: token.sn,
        an: token.an
      };
      const syncObjs = [];

      this.raida.showCoins(params).then(async response => {
        let syncObj = {};
        let counter = 0;
        let realCounter = 0;
        for (const key in response.coinsPerRaida) {
          syncObj[key] = response.coinsPerRaida[key];
          counter++;
          realCounter++;
          if (counter === 1000) {
            syncObjs.push(syncObj);
            syncObj = {};
            counter = 0;
          }
        }
        if (syncObj !== {}) {
          syncObjs.push(syncObj);
        }
        let fixCounter = 0;
        let returnCounter = 0;
        if (syncObjs.length === 0) {
          if (!completeCallBack) {
            this.checkBalance();
            completeCallBack = true;
          }
        }
        else {
          this.loadingMessage = 'Synchronizing SkyWallet...Group 0/' + syncObjs.length;
          for (const fixObj of syncObjs) {
            fixCounter++;
            this.loadingMessage = 'Synchronizing SkyWallet...Group ' + (fixCounter + 1) + '/' + syncObjs.length;
            await this.sleep(50);
            this.raida.fixCoinsSync(fixObj).then(fixResponse => {
              returnCounter++;
              if (returnCounter >= fixCounter) {
                if (!completeCallBack) {
                  this.checkBalance();
                  completeCallBack = true;
                }
              }

            }).catch(error => {
              returnCounter++;

              if (returnCounter >= fixCounter) {
                if (!completeCallBack) {
                  this.checkBalance();
                  completeCallBack = true;
                }
              }


            });

          }
        }

      });
    }
  }

  sleep(ms): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  onAmountChange(): void {
    if (this.amount) {
      this.amount = round(this.amount);
      if (this.amount > 86) {
        this.showAlertMessage("You will receive <b>" + (this.amount / 85.125).toFixed(2) + "</b> coins");
      }
    }
  }

  checkAmtValidity(): void {
    if (this.amount < 86) {
      this.amount = null;
      this.showAlertMessage("<span style='color:#ff7777;' class='failAlert'> <i class='fas fa-exclamation-triangle'></i> Amount cannot be less than 86 coins</span>");
    }
  }

  validateEmail(email): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  async upgrade() {
    if (isNaN(this.amount)) {
      this.showErrorMessage('Please enter a valid amount.');
      return;
    }
    if (this.amount < 86) {
      this.amount = null;
      this.showErrorMessage("Minimum amount is 86 coins. Amount should be a multiple of 85.125");
      return;
    }
    if (this.amount > this.balance) {
      this.showErrorMessage('Insufficient balance. You do not have enough coins to upgrade to CC 2.0');
      return;
    }

    let bankStorage: any = await this.apiService.getCloudcoinCount();
    if(!bankStorage || isNaN(bankStorage)) {
      this.showErrorMessage('Sorry, we are having some temporary server issues. Please try again later.');
      return;
    }
    if (bankStorage && bankStorage <= round(this.amount / 85.125)) {
      this.showErrorMessage(this.amount + ' coins cannot be upgraded at the moment due to insufficient Cloud Coins in the Bank. Please try again later.');
      return;
    }

    if (!this.to || this.to === '' || this.to.substr(0, 9).toLowerCase() !== 'cloudcoin') {
      this.showErrorMessage('Please enter a valid SkyWallet Merchant Account. Merchant accounts must start with the words CloudCoin, ' +
        'e.g. CloudCoin.merchant.com');
      return;
    }
    if (!this.skywallet || this.skywallet === '') {
      this.showErrorMessage('Unable to detect skywallet account. Please re-login and try again.');
      return;
    }
    if (!this.memo || this.memo === '') {
      this.showErrorMessage('Please enter your email address.');
      return;
    }
    else if (!this.validateEmail(this.memo)) {
      this.memo = '';
      this.showErrorMessage('Please type a valid email address');
      return;
    }

    if (!this.auth.getLoggedIn()) {
      this.auth.checkLoginStatus();
      this.router.navigate(['welcome']);
    }
    else {
      const token = this.auth.getToken();

      this.conversionGuid = this.raida.generateSeed();

      const coin = {
        sn: token.sn,
        an: token.an
      };
      const params = {
        an: coin.an,
        amount: this.amount,
        to: this.to,
        memo: this.memo,
        sender_name: this.skywallet,
        guid: this.conversionGuid
      };

      this.coinURL = this.coinBaseURL + "?guid=" + this.conversionGuid + "&email=" + this.memo;

      this.loadingMessage = 'Upgrading coins...';
      this.showLoading(true);

      this.raida.payment(params).then(response => {
        if (response.status === 'error') {
          if ('errorText' in response) {
            if (response.errorText.indexOf('Failed to resolve') !== -1) {
              this.showErrorMessage('Invalid Recipient SkyWallet Address: ' + this.to);
            }
            else {
              this.showErrorMessage(response.errorText);
            }
          }
          else {
            this.showErrorMessage('Your login session is not valid, please logout and try again');
          }
          return;
        }

        if (!('result' in response)) {
          this.showErrorMessage('Invalid response received');
          return;
        }

        this.amount = null;
        this.memo = null;
        this.showLoading(false);

        if(response.authenticNotes == 0 && response.frackedNotes == 0) {
          this.complete = false;
          this.showErrorMessage("Upgrade failed");
          return;
        }

        if((response.authenticNotes > 0 || response.frackedNotes > 0) && (response.errorNotes == 0 && response.counterfeitNotes == 0)) {
          this.complete = true;
          this.showDownload = true;
          this.showCompleteMessage("Upgrade Successful");
        }
        else if(response.authenticNotes > 0 || response.frackedNotes > 0 && response.errorNotes > 0) {
          this.complete = true;
          this.showDownload = false;
          this.showCompleteMessage("Upgrade partly successful");
        }
        else {
          this.complete = false;
          this.showErrorMessage("Upgrade failed!!");
          return;
        }



      });
    }

  }

  animationCreated(animationItem: AnimationItem): void {
    // console.log(animationItem);
  }

  showLoading(state): void {
    if (state) {
      this.showNormal = false;
      this.showLoader = true;
      this.showError = false;
      this.balanceLoader = false;
    }
    else {
      this.showNormal = true;
      this.showLoader = false;
      this.showError = false;
      this.balanceLoader = false;
      setTimeout(() => {
        if (this.autoFocusField) {
          this.autoFocusField.nativeElement.focus();
        }
      }, 100);
    }

  }
  showLoadingBalance(state): void {
    if (state) {
      this.showNormal = false;
      this.showLoader = false;
      this.showError = false;
      this.balanceLoader = true;
    }
    else {
      this.showNormal = true;
      this.showLoader = false;
      this.showError = false;
      this.balanceLoader = false;
      setTimeout(() => {
        if (this.autoFocusField) {
          this.autoFocusField.nativeElement.focus();
        }
      }, 100);
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

  showCompleteMessage(message): void {
    this.completeMessage = message;
    this.errorMessage = '';
    this.showNormal = false;
    this.showError = false;
    this.showLoader = false;
    this.complete = true;
  }

  showAlertMessage(message): void {
    this.totalAlert = message;
  }
}
