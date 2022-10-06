import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http:HttpClient) { }

  async getCloudcoinCount(){
    // return await this.http.get('https://coins.collectiblecolors.com:8443/api/coin-count').toPromise();
    return await this.http.get('https://payment.collectiblecolors.com:8443/coins/check.php').toPromise();
  }
}
