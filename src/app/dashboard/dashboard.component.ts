import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TasksService } from '../services/tasks.service';
import { SessionService } from '../services/session.service';
import { formatTaskLabel } from '../utils/legacy-format';
import { Task } from '../models/task.model';
import { SessionUser } from '../models/session.model';
import { getSafeHttpErrorMessage } from '../utils/http-error';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: SessionUser = {};
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private session: SessionService,
    private tasksService: TasksService
  ) {}

  statusLabel(status: string | undefined): string {
    const normalizedStatus = (status || '').toUpperCase();
    return STATUS_LABELS[normalizedStatus] || status || '';
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    this.user = this.session.getUser();
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }
    try {
      const response = await this.tasksService.getTasks(this.user.username || '', token);
      const tasks = response.data;
      const visibleTasks: Task[] = [];
      for (const task of tasks) {
        if (task.status !== 'ARCHIVED') {
          task.label = formatTaskLabel(task);
          visibleTasks.push(task);
        }
      }
      visibleTasks.sort((leftTask, rightTask) => {
        const leftPriority = leftTask.priority || '';
        const rightPriority = rightTask.priority || '';
        return leftPriority > rightPriority ? -1 : leftPriority < rightPriority ? 1 : 0;
      });
      // axios resuelve a veces fuera de la zona de Angular (más aún llegando
      // por navegación desde el login): forzamos volver a entrar a la zona
      // y disparamos detectChanges a mano para no depender de que Angular
      // lo detecte solo.
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = getSafeHttpErrorMessage(error, 'No se pudo cargar el dashboard.');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clearSession();
    await this.router.navigate(['/login']);
  }
}
