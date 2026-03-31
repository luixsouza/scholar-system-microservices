import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'alunos', pathMatch: 'full' },
  { path: 'alunos', loadComponent: () => import('./alunos/alunos.component').then(m => m.AlunosComponent) },
  { path: 'professores', loadComponent: () => import('./professores/professores.component').then(m => m.ProfessoresComponent) },
  { path: 'disciplinas', loadComponent: () => import('./disciplinas/disciplinas.component').then(m => m.DisciplinasComponent) },
  { path: 'matriculas', loadComponent: () => import('./matriculas/matriculas.component').then(m => m.MatriculasComponent) },
];
