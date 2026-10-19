import { Injectable } from '@angular/core';
import { AxiosResponse } from 'axios';
import axios from 'axios';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(username: string, password: string): Promise<AxiosResponse<LoginResponse>> {
    const request: LoginRequest = { username, password, client: 'angular-workshop' };
    return axios.post<LoginResponse>(
      `${environment.authApiUrl}/auth/login`,
      request,
      { timeout: 5000 }
    );
  }
}