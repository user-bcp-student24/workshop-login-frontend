import { SessionUser } from './session.model';

export interface LoginRequest {
  username: string;
  password: string;
  client: 'angular-workshop';
}

export interface LoginResponse {
  token?: string;
  user?: SessionUser;
}