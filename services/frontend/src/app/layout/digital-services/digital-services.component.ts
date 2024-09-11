/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
import { Component, inject } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { firstValueFrom, lastValueFrom } from "rxjs";
import { DigitalService } from "src/app/core/interfaces/digital-service.interfaces";
import { UserService } from "src/app/core/service/business/user.service";
import { DigitalServicesDataService } from "src/app/core/service/data/digital-services-data.service";
import { GlobalStoreService } from "src/app/core/store/global.store";

@Component({
    selector: "app-digital-services",
    templateUrl: "./digital-services.component.html",
    providers: [MessageService, ConfirmationService],
})
export class DigitalServicesComponent {
    private global = inject(GlobalStoreService);

    digitalServices: DigitalService[] = [];
    selectedDigitalService: DigitalService = {} as DigitalService;
    sidebarVisible = false;

    myDigitalServices: DigitalService[] = [];
    sharedDigitalServices: DigitalService[] = [];

    constructor(
        private digitalServicesData: DigitalServicesDataService,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private messageService: MessageService,
        public userService: UserService,
    ) {}

    async ngOnInit(): Promise<void> {
        this.global.setLoading(true);
        await this.retrieveDigitalServices();
        this.global.setLoading(false);

        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.retrieveDigitalServices();
            }
        });
    }

    async retrieveDigitalServices() {
        const userId = (await firstValueFrom(this.userService.user$)).id;

        this.myDigitalServices = [];
        this.sharedDigitalServices = [];

        const apiResult = await lastValueFrom(this.digitalServicesData.list());
        apiResult.sort((x, y) => x.name.localeCompare(y.name));

        apiResult.forEach((digitalService) => {
            if (digitalService.userId === userId) {
                this.myDigitalServices.push(digitalService);
            } else {
                this.sharedDigitalServices.push(digitalService);
            }
        });
    }

    async createNewDigitalService() {
        const { uid } = await lastValueFrom(this.digitalServicesData.create());
        this.goToDigitalServiceFootprint(uid);
    }

    goToDigitalServiceFootprint(uid: string) {
        this.router.navigate([`${uid}/footprint/terminals`], {
            relativeTo: this.route,
        });
    }

    itemNoteOpened(digitalService: DigitalService) {
        this.sidebarVisible = true;
        this.selectedDigitalService = digitalService;
    }

    async itemDelete(uid: string) {
        this.global.setLoading(true);
        await lastValueFrom(this.digitalServicesData.delete(uid));
        await this.retrieveDigitalServices();
        this.global.setLoading(false);
    }

    noteSaveValue(event: any) {
        // Get digital services data.
        this.digitalServicesData.get(this.selectedDigitalService.uid).subscribe((res) => {
            // update note
            res.note = {
                content: event,
            };
            this.digitalServicesData.update(res).subscribe(() => {
                this.messageService.add({
                    severity: "success",
                    summary: this.translate.instant("common.note.save"),
                    sticky: false,
                });
                this.selectedDigitalService.note = {
                    content: event,
                };
            });
        });
    }

    noteDelete() {
        // Get digital services data.
        this.digitalServicesData.get(this.selectedDigitalService.uid).subscribe((res) => {
            // update note
            res.note = undefined;
            this.digitalServicesData.update(res).subscribe(() => {
                this.messageService.add({
                    severity: "success",
                    summary: this.translate.instant("common.note.delete"),
                    sticky: false,
                });
            });
        });
        this.selectedDigitalService.note = undefined;
    }
}
