import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Professor } from '../models/professor.model';

@Injectable({ providedIn: 'root' })
export class ProfessorService {
  private readonly url = 'http://localhost:8080/api/professores';

  constructor(private http: HttpClient) {}

  listar(): Observable<Professor[]> {
    return this.http.get<Professor[]>(this.url);
  }

  buscarPorId(id: number): Observable<Professor> {
    return this.http.get<Professor>(`${this.url}/${id}`);
  }

  criar(professor: Professor): Observable<Professor> {
    return this.http.post<Professor>(this.url, professor);
  }

  atualizar(id: number, professor: Professor): Observable<Professor> {
    return this.http.put<Professor>(`${this.url}/${id}`, professor);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
