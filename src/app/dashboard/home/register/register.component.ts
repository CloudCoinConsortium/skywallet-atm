import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {RaidaServiceService} from 'src/app/raida-service.service';
import * as CryptoJS from 'crypto-js';
import {AnimationOptions} from 'ngx-lottie';
import {AnimationItem} from 'lottie-web';
import RaidaJS from 'raidajs';
import {toBase64String} from '@angular/compiler/src/output/source_map';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  selectedFile: File;
  selectedData: any = null;
  walletName: any;
  walletEmail: any;
  walletPin: string;
  agreed1 = false;
  agreed2 = true;
  registerTapped = false;
  complete = false;
  errorMessage: string = null;
  registerParams: any = null;
  completeMessage: string = null;
  cardImage: string = null;
  cardImageBlank: string = null;
  progressMessage: string = null;
  options: AnimationOptions = {
    path: '/assets/animations/cloud_login.json'
  };
  errorOptions: AnimationOptions = {
    path: '/assets/animations/error.json'
  };
  showLoader = false;
  showNormal = true;
  showError = false;
  buttonText = 'Select CloudCoin';
  public raidaJS = new RaidaJS();
  freeCoin = false;
  uniqueString = null;

  constructor(private changeDetectorRef: ChangeDetectorRef, private raida: RaidaServiceService) {
    this.raida.getUniqueKey().then(response => {
      const data = response.trim().split('\n').reduce(function(obj, pair) {
        pair = pair.split('=');
        return obj[pair[0]] = pair[1], obj;
      }, {});
      const seed = btoa(JSON.stringify(data));
      this.uniqueString = CryptoJS.MD5(seed).toString(CryptoJS.enc.Hex);
    }, error => {
     this.uniqueString = CryptoJS.MD5(new Date().getMilliseconds()).toString(CryptoJS.enc.Hex);
    });
    /*  */
  }

  @ViewChild('autofocus') autoFocusField: ElementRef;
  ngAfterViewInit(): void {
    this.autoFocusField.nativeElement.focus();
  }

  ngOnInit(): void {

  }



  onFileChanged(event): void {
    this.buttonText = 'Select CloudCoin';
    this.selectedFile = event.target.files[0];
    const fileReader = new FileReader();
    const me = this;
    fileReader.readAsText(this.selectedFile, 'UTF-8');
    fileReader.onload = () => {
      this.selectedData = fileReader.result;
      try {
        const coin = JSON.parse(this.selectedData);
        if (coin.cloudcoin) {
          const stack = coin.cloudcoin;
          if (stack.length > 1) {
            this.showErrorMessage('Stack for registration must contain only one CloudCoin');
            this.selectedData = {};
            return;
          }
          for (let i = 0; i < stack.length; i++) {
            const cc = stack[i];
            if (!cc.sn) {
              this.showErrorMessage('Please choose a valid CloudCoin');
              this.selectedData = {};
              return;
            }
            const total = me.raida.getDenomination(cc.sn);
            if (total < 1) {
              this.showErrorMessage('Please choose a valid CloudCoin');
              this.selectedData = {};
              return;
            } else {
              this.buttonText = '1 CloudCoin Selected';
            }
          }
        } else {
          this.showErrorMessage('Please choose a valid CloudCoin');
          this.selectedData = {};
          return;
        }

      } catch (e) {
        if (e.indexOf('Failed to resolve DNS name') === -1) {
          console.log(e);
          me.showErrorMessage('Failed to parse CloudCoin');
          return;
        }
      }

    };
    fileReader.onerror = (error) => {
      console.log(error);
      this.showErrorMessage('Cannot Parse CloudCoin');
    };
  }

  validateEmail(email): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  register(): void {
    if (this.registerTapped) {
      return;
    }
    else {
      this.registerTapped = true;
    }

    // alert(this.agreed1 + 'and ' + this.agreed2);
    if (!this.agreed1 || !this.agreed2)
    {
      this.showErrorMessage('Please accept to the terms and conditions of registration to proceed');
      this.registerTapped = false;
      return;
    }

    if (!this.walletName || this.walletName === '') {
        this.showErrorMessage('Please enter a valid wallet name');
        this.registerTapped = false;
        return;

    }

    if (!this.walletEmail || this.walletEmail === '' || !this.validateEmail(this.walletEmail)) {
      this.showErrorMessage('Please type a valid email address');
      this.registerTapped = false;
      return;
    }


    if (!this.walletPin || this.walletPin.length < 8) {
      this.showErrorMessage('Please enter a valid Password (minimum 8 characters)');
      this.registerTapped = false;
      return;
    }

    if (!(this.walletName.endsWith('.skywallet.cc'))) {
      this.showErrorMessage('Your Wallet Name must end in ".skywallet.cc". Your input was "' + this.walletName + '". Please format it like'
        + ' "JohnDoe.skywallet.cc"');
      this.registerTapped = false;
      return;
    }

    const alias = this.walletName.replace(/\.skywallet\.cc$/, '');
    if (!alias.match(/[a-z0-9]{1,62}/)) {
      this.showErrorMessage('Only alphanumeric characters are allowed. Max length 62');
      this.registerTapped = false;
      return;
    }

    if(this.freeCoin && this.uniqueString != null)
    {
      this.raidaJS.apiGetFreeCoin(this.uniqueString).then(response => {
        if ('status' in response && response.status === 'error')  {
          this.freeCoin = false;
          this.agreed2 = false;
          this.preRegister();
          return;
        }
        else {
          this.selectedData = {cloudcoin: [response]};
          this.freeCoin = true;
          this.agreed2 = true;
          this.selectedData = JSON.stringify(this.selectedData);
          this.preRegister();
        }
      });
    }
    else
    {
      this.freeCoin = false;
      this.agreed2 = false;
      this.preRegister();
    }
  }
  preRegister(): void
  {
    if (!this.selectedData || this.selectedData === {}) {
      this.showErrorMessage('Free coin could not be fetched, please select a CloudCoin to be used for registration');
      this.registerTapped = false;
      return;
    }

    this.raidaJS._resolveDNS(this.walletName).then(data => {
        if (data != null) {
          this.showErrorMessage('SkyWallet already exists');
          this.registerTapped = false;
          return;
        } else {

          if (this.selectedData != null) {
            let snString = '';
            let anArray = [];
            let nnString = 1;
            try {
              JSON.parse(this.selectedData).cloudcoin.forEach((element, index) => {
                if (index === 0) {
                  snString = element.sn;
                  anArray = element.an;
                  nnString = element.nn;
                }
              });
              if (snString !== '' && anArray !== []) {
                // generate a new card number
                const params = {
                  // Username
                  sn : snString,
                  // Password
                  password : this.walletPin,
                  // Recovery Email
                  email: this.walletEmail
                };
                const response = this.raida.ccRegister(params).then(ccCardData => {
                  if ((ccCardData as any).status === 'done')
                  {
                    const cardGenerated = this.makeCard((ccCardData as any).rand);
                    const cardNumber = cardGenerated.number;
                    const cvv = (ccCardData as any).cvv;
                    const pans = (ccCardData as any).pans;
                    // pown the card with the new ans
                    this.showLoading(true);
                    this.progressMessage = 'Detecting Coin\'s authenticity..';
                    const pownParams = [{sn: parseInt(snString), an: anArray, pan: pans}];
                    const result = this.raida.apiDetect(pownParams).then(detectResponse => {
                      // console.log('Detect finished. Fixing Fracked coins');
                      const validCoins = detectResponse.authenticNotes + detectResponse.frackedNotes;
                      if (validCoins === 0) {
                        this.showErrorMessage('Selected CloudCoin is not valid');
                        this.registerTapped = false;
                        return;
                      }
                      else
                      {
                        if(detectResponse.frackedNotes > 0 )
                        {
                          this.raida.fixFracked(detectResponse.result).then(frackedResponse => {
                          });
                        }
                        this.prepareCard(cardNumber, cardGenerated, cvv, pans, snString, nnString);
                      }
                    });
                  }
                  else
                  {
                    this.showErrorMessage('Error generating card from info');
                    return;
                  }
                });
              } else {
                this.showErrorMessage('Selected CloudCoin is not valid');
                this.registerTapped = false;
                return;
              }
            } catch (e) {
              console.log(e);
              if (e.indexOf('Failed to resolve DNS name') === -1) {
                this.showErrorMessage(e.toString());
                this.registerTapped = false;
                return;
              }
            }
          } else {
            this.showErrorMessage('Please select the CloudCoin to be used for registration');
            this.registerTapped = false;
          }
        }
      }
    );
  }
  prepareCard(cardNumber, cardGenerated, cvv, pans, snString, nnString): void {
    this.progressMessage = 'Generating debit card..';
    const ip = '1.' + ((parseInt(snString) >> 16) & 0xff) + '.' + ((parseInt(snString) >> 8) & 0xff) + '.'
      + ((parseInt(snString)) & 0xff);
    const cardData = {
      name: this.walletName,
      number: cardNumber,
      expiry: cardGenerated.expiry,
      pin: cvv,
      ip
    }; // 'Partha Dasgupta', 50, 50, '#FFFFFF', '18px courier'
    this.registerParams = {
      name: this.walletName,
      coin: {
        sn: snString,
        an: pans,
        nn: nnString
      }
    };
    this.addTextToImage('assets/card.png', cardData, this.registerParams, this.doRegister);
  }

  doRegister(me, registerParams): void {
     me.progressMessage = 'Creating SkyWallet Account...';
     me.raida.register(registerParams).then(registerResponse => {
      if (registerResponse.status === 'done') {
        me.generateCard(registerParams);
      }
      else
      {
        this.showErrorMessage(registerResponse.errorText);
        this.registerTapped = false;
      }
    }, error => {
       this.raidaJS._resolveDNS(this.walletName).then(data => {
         if (data != null) {
           me.generateCard(registerParams);
         }
       });
     });
  }
  generateCard(registerParams): void {
    // if correct coin
    this.progressMessage = 'SkyWallet account created..';
    const coinParam = {
      // array of coins
      coins: [{
        sn: parseInt(registerParams.coin.sn),
        nn: 1,
        an: registerParams.coin.pan
      }],
      // PNG URL. Must be the compatible with CORS policy
      // The URL can be specified in Base64 format if you prepend 'data:application/octet-binary;base64,' to it
      template: this.cardImageBlank
    };
    try {
      this.raidaJS.embedInImage(coinParam).then(coinResponse => {
        if (coinResponse.status && coinResponse.status === 'error')
        {
          this.showErrorMessage(coinResponse.errorText);
          this.registerTapped = false;
        }
        else
        {
          this.showCompleteMessage('Registration Successful!');
          this.cardImage = 'data:image/png;base64,' + coinResponse;
        }

      });
    } catch (e) {
      console.log(e);
    }
  }
  makeCard(rand): any {
    const precardNumber = '401' + rand;
    const reverse = precardNumber.split('').reverse().join('');
    let total = 0;
    for (let i = 0; i < reverse.length; i++) {
      let num = parseInt(reverse.charAt(i));
      if ((i + 3) % 2) {
        num *= 2;
        if (num > 9) {
          num -= 9;
        }
      }
      total += num;
    }

    let remainder = 10 - (total % 10);
    if (remainder === 10) {
      remainder = 0;
    }

    const cardNumber = precardNumber + remainder;

    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

    const month = fiveYearsFromNow.getMonth() + 1;
    const year = fiveYearsFromNow.getFullYear().toString().substr(-2);
    return {number: cardNumber, expiry: month + '-' + year};
  }

  downloadImage(): void {
    const a = document.createElement('a'); // Create <a>
    a.href = this.cardImage; // Image Base64 Goes here
    a.download = this.walletName + '.png'; // File name Here
    a.click();

  }

  getPansFromPasswordV2(sn, email, password): any {

    const params = {
      // Username
      sn,
      // Password
      password,
      // Recovery Email
      email
    };
    let grv = null;
    const response = this.raida.ccRegister(params).then(data => {
        if ((data as any).status === 'done')
        {
          grv = {pas: (data as any).pans, rand: (data as any).rand, pin: (data as any).cvv};
        }
        else
        {
          this.showErrorMessage('Error generating card from info');
          return;
        }
    });
    return grv;
  }


  getPansFromPassword(sn, email, password): any {
    let finalStr = '';
    for (let i = 0; i < password.length; i++) {
      const code = password.charCodeAt(i);
      finalStr += '' + code;
    }

    // Generating rand and pin from the password
    const rand = finalStr.slice(0, 12);
    const pin = finalStr.slice(12, 16);
    const pans = [];
    for (let i = 0; i < 25; i++) {
      const seed = '' + i + sn + rand + pin;
      const p = '' + CryptoJS.MD5(seed);

      const p0 = p.substring(0, 24);
      let component = '' + sn + '' + i + email;
      component = '' + CryptoJS.MD5(component);
      const p1 = component.substring(0, 8);
      pans[i] = p0 + p1;
    }

    const grv = {pans, rand, pin};

    return grv;
  }


  generate(n): string {
    const add = 1;
    let max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

    if (n > max) {
      return this.generate(max) + this.generate(n - max);
    }

    max = Math.pow(10, n + add);
    const min = max / 10; // Math.pow(10, n) basically
    const cardNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    return ('' + cardNumber).substring(add);
  }

  animationCreated(animationItem: AnimationItem): void {
    // console.log(animationItem);
  }

  showLoading(state): void {
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

  showCompleteMessage(message): void {
    this.errorMessage = '';
    this.showNormal = false;
    this.showError = false;
    this.showLoader = false;
    this.completeMessage = message;
    this.complete = true;
  }

  addTextToImage(imagePath, cardData, registerParams, callback): void {
    const card_canvas = document.createElement('canvas');
    card_canvas.setAttribute('width', '700');
    card_canvas.setAttribute('height', '906');
    const context = card_canvas.getContext('2d');
    const me = this;
    // Draw Image function
    const img = new Image();
    img.src = imagePath;
    img.onload = function() {
      context.drawImage(img, 0, 0);
      context.lineWidth = 0;
      // context.lineStyle = color;
      context.fillStyle = '#FFFFFF';
      context.font = '30px sans-serif';
      context.fillText(cardData.name, 50, 400);
      context.font = '40px sans-serif';
      context.fillText(cardData.number.replace(/(.{4})/g, '$1 '), 50, 300);
      context.font = '18px sans-serif';
      context.fillText('Keep these numbers secret, do not give to merchants', 50, 325);
      context.font = '18px sans-serif';
      context.fillText('Share this name with others for receiving payments', 50, 425);

      context.font = '25px sans-serif';
      context.fillText(cardData.expiry, 450, 355);
      context.fillStyle = '#000000';
      context.fillText('CVV (keep secret): ' + cardData.pin, 50, 675);
      context.fillStyle = '#ffffff';
      context.fillText( 'IP ' + String(cardData.ip), 150, 740);


      me.cardImageBlank = card_canvas.toDataURL(); // 'data:image/png;base64,' + coinResponse;
      callback(me, registerParams);
    };
  }

}
