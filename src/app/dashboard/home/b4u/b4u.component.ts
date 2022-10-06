import { AnimationItem } from 'lottie-web';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from './../../../service/login.service';
import { RaidaServiceService } from './../../../raida-service.service';
import { AnimationOptions } from 'ngx-lottie';
import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-b4u',
  templateUrl: './b4u.component.html',
  styleUrls: ['./b4u.component.scss']
})
export class B4uComponent implements OnInit {

  public balance = 0;
  public balanceString = '0';
  public balances: any = {};
  errorMessage: string = null;
  options: AnimationOptions = {
    path: '/assets/animations/cloud_loading.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  showNormal = true;
  showError = false;
  balanceBreakup: string = null;
  opinions = 0;
  loadingMessage = '';
  complete = false;
  completeMessage: string = null;

  mySkyWallet: string = null;
  cc:number = 0;
  usd:any;
  guid:any;
  merchantID:any;
  merchantName:string = null;
  terminalID:any;
  paymentTo:any;
  memo: string;
  paymentRoute:any;

  constructor(private raida: RaidaServiceService, private auth: LoginService, private router: Router, private activatedRoute:ActivatedRoute, private http: HttpClient) {

    this.checkBalance();
    localStorage.setItem('paymentRoute', 'null');
    localStorage.removeItem('paymentRoute');

    this.activatedRoute.queryParams.subscribe(params => {
      this.cc = params['cc'] ? params['cc'] : 0;
      this.usd = params['usd'] ? params['usd'] : null;
      this.guid = params['b4u'] ? params['b4u'] : null;
      this.merchantID = params['m'] ? params['m'] : null;
      this.merchantName = params['n'] ? params['n'] : null;
      this.terminalID = params['t'] ? params['t'] : null;
      this.paymentTo = params['to'] ? params['to'] : null;
    });

    const paymentRoute = {
      m: this.merchantID,
      t: this.terminalID,
      b4u: this.guid,
      cc: this.cc,
      to: this.paymentTo,
      usd: this.usd,
      mn: this.merchantName
    }

    if (!this.auth.getLoggedIn()) {
      localStorage.setItem("paymentRoute", JSON.stringify(paymentRoute));
      this.router.navigate(['login']);
    }

    if(!this.paymentTo || !this.usd || !this.guid || !this.merchantID || !this.terminalID){
      this.router.navigate(['balance']);
    }
  }

  ngOnInit(): void {
    if (localStorage.getItem('skywallet')) {
      this.mySkyWallet = localStorage.getItem('skywallet');
    }
  }

  checkBalance(): void {
    this.showLoading(true);
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
              if (response.balances[key] > highestOpinion)
              {
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
                {
                 this.syncAccount();
                }
              }
            });
          }
        }

        this.showLoading(false);

      });
    }

  }

  animationCreated(animationItem: AnimationItem): void {
    // console.log(animationItem);
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
          if (counter === 1000)
          {
            syncObjs.push(syncObj);
            syncObj = {};
            counter = 0;
          }
        }
        if (syncObj !== {})
        {
          syncObjs.push(syncObj);
        }
        let fixCounter = 0;
        let returnCounter = 0;
        if (syncObjs.length === 0)
        {
          if(!completeCallBack)
          {
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
                if(!completeCallBack)
                {
                  this.checkBalance();
                  completeCallBack = true;
                }
              }

            }).catch(error => {
              returnCounter++;

              if (returnCounter >= fixCounter) {
                if(!completeCallBack)
                {
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

  callWebHook(): void {
    let url = 'https://b4uATM.com/cloudcoin?m=' + this.merchantID + '&t=' + this.terminalID + '&b4u=' + this.guid + '&cc=' + this.cc + '&usd=' + this.usd + '';

    if(this.merchantName) {
      url = url + '&n=' + this.merchantName;
    }

    this.http.get<any>(url).subscribe(data => {
      console.log(data);
    });

  }

  async payment() {
    if (isNaN(this.cc) ||  this.cc < 1 )
    {
      this.showErrorMessage('Invalid amount');
      return;
    }

    if (this.cc > this.balance)
    {
      this.showErrorMessage('Not enough balance!! Current balance: ' + this.balanceString + ' CC');
      return;
    }

    this.memo = 'Payment of $' + this.usd + ' towards Merchant ID: ' + this.merchantID + ' and Terminal ID: ' + this.terminalID;

    const token = this.auth.getToken();

    const coin = {
      sn: token.sn,
      an: token.an
    };
    const params = {an: coin.an, amount: this.cc, to: this.paymentTo, memo : this.memo, sender_name: this.mySkyWallet, guid: this.guid };

    this.showLoading(true);
    let response = await this.raida.payment(params);
    if(response){
      if (response.status === 'error') {
        if ('errorText' in response) {
          if (response.errorText.indexOf('Failed to resolve') !== -1) {
            this.showErrorMessage('Invalid Recipient SkyVault Address: ' + this.paymentTo);
          }
          else
          {
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

      for (const sn in response.result) {
        const cc = response.result[sn];
        const ccadd = {
          sn,
          nn : cc.nn,
          an : cc.an,
          pown : cc.pownstring
        };

      }

      this.complete = true;
      this.completeMessage = "Payment completed";
      setTimeout(() => {
        this.router.navigate(['/balance']);
      }, 2000);
    }
  }

  sleep(ms): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showLoading(state): void {
    this.loadingMessage = '';
    if (state) {
      this.showNormal = false;
      this.showLoader = true;
      this.showError = false;
    } else {
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

  showCompleteMessage(message): void
  {
    this.completeMessage = message;
    this.complete = true;
    this.showError = false;
    this.showNormal = false;
    this.showLoader = false;
  }
}
