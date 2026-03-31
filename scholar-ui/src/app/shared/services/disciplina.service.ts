import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Disciplina } from '../models/disciplina.model';

@Injectable({ providedIn: 'root' })
export class DisciplinaService {
  private readonly url = 'http://localhost:8080/api/disciplinas';

  constructor(private http: HttpClient) {}

  listar(): Observable<Disciplina[]> {
    return this.http.get<Disciplina[]>(this.url);
  }

  buscarPorId(id: number): Observable<Disciplina> {
    return this.http.get<Disciplina>(`${this.url}/${id}`);
  }

  criar(disciplina: Disciplina): Observable<Disciplina> {
    return this.http.post<Disciplina>(this.url, disciplina);
  }

  atualizar(id: number, disciplina: Disciplina): Observable<Disciplina> {
    return this.http.put<Disciplina>(`${this.url}/${id}`, disciplina);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
