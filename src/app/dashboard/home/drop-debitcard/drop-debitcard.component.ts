import {Component, OnInit} from '@angular/core';
import {LoginService} from '../../../service/login.service';
import {Router} from '@angular/router';
import {RaidaServiceService} from '../../../raida-service.service';
import {AnimationOptions} from 'ngx-lottie';
import {AnimationItem} from 'lottie-web';

@Component({
  selector: 'app-drop-debitcard',
  templateUrl: './drop-debitcard.component.html',
  styleUrls: ['./drop-debitcard.component.scss']
})
export class DropDebitcardComponent implements OnInit {

  files: File[] = [];
  errorMessage: string = null;
  options: AnimationOptions = {
    path: '/assets/animations/cloud_login.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  showNormal = true;
  showError = false;

  constructor(private auth: LoginService, private router: Router, private  raida: RaidaServiceService) {
  }


  onSelect(event): void {
    this.files.push(...event.addedFiles);
    this.getBase64(event);
  }

  getBase64(event): void {
    const me = this;
    const file = event.addedFiles[0];
    const reader = new FileReader();
    let alias = file.name;
    const walletName = alias.replace(/\.png$/, '');

    reader.readAsDataURL(file);
    reader.onload = function() {
      const params = {
        template: reader.result
      };
      me.showLoading(true);
      me.raida.loginWithCardImage(params).then(response => {
        if (response.status === 'error')
        {
          if(response.errorText.indexOf('PNG signature'))
          {
            me.showErrorMessage('The dropped debit card image is not valid. Please ensure you are using the ' +
              'original unmodified debit card image, which can be modified if shared via messaging/file sharing apps.');
          }
          else
          {
            me.showErrorMessage(response.errorText);
          }
        }
        else {
          if (response.status === 'done' && response.cloudcoin !== null && response.cloudcoin.length > 0)
          {
            const cloudcoin = response.cloudcoin[0];

            const coinParams = {
              sn: cloudcoin.sn,
              an: cloudcoin.an
            };
            me.raida.showBalance(coinParams).then(coinResponse => {
              let loggedIn = false;
              if(coinResponse.status && coinResponse.status == 'error') {
                loggedIn = false;
                me.showErrorMessage('This SkyWallet account is counterfeit');
                return;
              }
              if (coinResponse.raidaStatuses.indexOf('p') === -1) {
                loggedIn = false;
              } else {
                loggedIn = true;
              }
              if (loggedIn === true) {

                localStorage.setItem('cc', JSON.stringify(cloudcoin));
                localStorage.setItem('skywallet',walletName);

                me.auth.checkLoginStatus();
                let paymentRoute = JSON.parse(localStorage.getItem('paymentRoute'));
                if(paymentRoute) {
                  setTimeout(() => {
                    me.router.navigate(['/b4u'], { queryParams: paymentRoute });
                  }, 2500);
                }
                else{
                  setTimeout(() => {
                    me.router.navigate(['/balance']);
                  }, 2500);
                }
              } else {
                me.showErrorMessage('Invalid SkyWallet name/password');
              }
            });

          }
        }
      });

    };
    reader.onerror = function(error) {
      me.showErrorMessage('Error reading Card Image');
    };
  }

  onRemove(event): void {
    this.files.splice(this.files.indexOf(event), 1);
  }


  ngOnInit(): void {
    if (this.auth.getLoggedIn()) {
      this.router.navigate(['/balance']);
    }
  }

  animationCreated(animationItem: AnimationItem): void {
    // console.log(animationItem);
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
