import {Component, OnInit, AfterViewInit, ViewChild, ElementRef} from '@angular/core';
import {RaidaServiceService} from '../../../raida-service.service';
import {LoginService} from '../../../service/login.service';
import {Router} from '@angular/router';
import { AnimationItem } from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {

  userName: string = null;
  password: string = null;
  options: AnimationOptions = {
    path: '/assets/animations/cloud_login.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  showNormal = true;
  showError = false;
  errorMessage: string = null;

  constructor(private auth: LoginService, private router: Router, private raida: RaidaServiceService, ) { }
  @ViewChild('autofocus') autoFocusField: ElementRef;
  ngAfterViewInit(): void {
    this.autoFocusField.nativeElement.focus();
  }

  ngOnInit(): void {
    if (this.auth.getLoggedIn())
    {
      this.router.navigate(['/balance']);
    }
  }

  login(): void {
    if (!this.userName || this.userName === '') {
      this.showErrorMessage('Invalid wallet name');
      return;
    }
    if (!this.password || this.password === '') {
      this.showErrorMessage('Invalid card number');
      return;
    }

    this.showLoading(true);
    const params = {
      // Username
      username : this.userName,

      // Password
      password : this.password
    };
    this.raida.loginWithPassword(params).then(response => {
      if (response.status === 'error')
      {
        if (response.errorText.indexOf('Failed to resolve DNS') !== -1) {
          this.showErrorMessage('Invalid SkyWallet name/password');
        }
        else {
          this.showErrorMessage(response.errorText);
        }
      }
      else {
        if (response.status === 'done')
        {
          const cloudcoin = response.cc;
          if (!cloudcoin.an && cloudcoin.ans) {
            cloudcoin.an = cloudcoin.ans;
          }
          const coinParams = {
            sn: cloudcoin.sn,
            an: cloudcoin.an
          };

          this.raida.showBalance(coinParams).then(coinResponse => {
            let loggedIn = false;
            if(coinResponse.status === 'error') {
              this.showErrorMessage("Failed to Authenticate");
              return;
            }
            else if (coinResponse.raidaStatuses && coinResponse.raidaStatuses.indexOf('p') === -1) {
              loggedIn = false;
            }
            else
            {
              loggedIn = true;
            }
            if(loggedIn === true)
            {
              localStorage.setItem('cc', JSON.stringify(cloudcoin));
              localStorage.setItem('skywallet', this.userName);
              this.auth.checkLoginStatus();
              let paymentRoute = JSON.parse(localStorage.getItem('paymentRoute'));
              if(paymentRoute) {
                setTimeout(() => {
                  this.router.navigate(['/b4u'], { queryParams: paymentRoute });
                }, 2500);
              }
              else{
                setTimeout(() => {
                  this.router.navigate(['/balance']);
                }, 2500);
              }
            }
            else
            {
              this.showErrorMessage('Invalid SkyWallet name/password');
            }
          });
        }
      }
    });
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
