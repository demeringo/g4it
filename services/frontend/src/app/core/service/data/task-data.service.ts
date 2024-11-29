/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Constants } from "src/constants";
import { TaskRest } from "../../interfaces/inventory.interfaces";

const endpoint = Constants.ENDPOINTS.inventories;

@Injectable({
    providedIn: "root",
})
export class TaskDataService {
    constructor(private http: HttpClient) {}

    getTask(inventoryId: number, taskId: number): Observable<TaskRest> {
        return this.http.get<TaskRest>(`${endpoint}/${inventoryId}/task/${taskId}`);
    }
}