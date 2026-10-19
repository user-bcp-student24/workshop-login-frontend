import { Injectable } from '@angular/core';
import { AxiosResponse } from 'axios';
import axios from 'axios';
import { Task } from '../models/task.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TasksService {
  getTasks(owner: string, token: string): Promise<AxiosResponse<Task[]>> {
    return axios.get<Task[]>(`${environment.tasksApiUrl}/api/tasks?owner=${owner}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}