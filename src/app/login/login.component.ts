import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { UserPreferences } from '../models/session.model';
import { getSafeHttpErrorMessage } from '../utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: UserPreferences = { theme: 'light', showTips: true, compact: false };

  constructor(
    private router: Router,
    private session: SessionService,
    private auth: AuthService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.preferences = this.session.loadPreferences(this.preferences);
  }

  async login(): Promise<void> {
    this.message = '';
    if (!this.username.trim()) {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (!this.password.trim()) {
      this.message = 'Ingrese una contraseña.';
      return;
    }

    this.busy = true;
    try {
      const response = await this.auth.login(this.username, this.password);
      if (response.data.token) {
        this.zone.run(() => {
          this.session.setSession(response.data.token!, response.data.user ?? {});
          this.session.savePreferences(this.preferences);
        });
        await this.zone.run(() => this.router.navigate(['/dashboard']));
      } else {
        this.zone.run(() => {
          this.message = 'El backend respondió sin token.';
        });
      }
    } catch (error: unknown) {
      this.zone.run(() => {
        this.message = getSafeHttpErrorMessage(
          error,
          'No se pudo autenticar. Verifique el usuario y la contraseña.'
        );
        console.error(error);
      });
    } finally {
      this.zone.run(() => {
        this.busy = false;
        this.cdr.detectChanges();
      });
    }
  }
}
