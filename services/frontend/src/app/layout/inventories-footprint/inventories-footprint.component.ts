/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { MenuItem } from "primeng/api";
import { firstValueFrom } from "rxjs";
import { Filter } from "src/app/core/interfaces/filter.interface";
import { FootprintDataService } from "src/app/core/service/data/footprint-data.service";
import {
    ChartData,
    ComputedSelection,
    Criteria,
    Criterias,
    Datacenter,
    PhysicalEquipmentAvgAge,
    PhysicalEquipmentLowImpact,
} from "src/app/core/store/footprint.repository";
import { FootprintStoreService } from "src/app/core/store/footprint.store";
import { GlobalStoreService } from "src/app/core/store/global.store";
import * as LifeCycleUtils from "src/app/core/utils/lifecycle";
import { Constants } from "src/constants";

@Component({
    selector: "app-inventories-footprint",
    templateUrl: "./inventories-footprint.component.html",
})
export class InventoriesFootprintComponent implements OnInit {
    protected footprintStore = inject(FootprintStoreService);
    private global = inject(GlobalStoreService);

    selectedView: string = "";

    echartsData: any = [];

    chartData: ChartData<ComputedSelection> = {};

    criterias = [Constants.MUTLI_CRITERIA, ...Constants.CRITERIAS];

    criteres: MenuItem[] = this.criterias.map((criteria) => {
        return {
            label: this.translate.instant(`criteria.${criteria}.title`),
            routerLink: `../${criteria}`,
        };
    });

    allUnmodifiedFootprint: Criterias = {} as Criterias;
    allUnmodifiedFilters: Filter = {} as Filter;
    allUnmodifiedDatacenters: Datacenter[] = [] as Datacenter[];
    allUnmodifiedEquipments: [PhysicalEquipmentAvgAge[], PhysicalEquipmentLowImpact[]] = [
        [],
        [],
    ];
    allUnmodifiedCriteriaFootprint: Criteria = {} as Criteria;

    order = LifeCycleUtils.getLifeCycleList();
    lifeCycleMap = LifeCycleUtils.getLifeCycleMap();

    filterFields = Constants.EQUIPMENT_FILTERS;
    multiCriteria = Constants.MUTLI_CRITERIA;
    inventoryId = 0;

    constructor(
        private activatedRoute: ActivatedRoute,
        private footprintDataService: FootprintDataService,
        private translate: TranslateService,
    ) {}

    async ngOnInit() {
        const criteria = this.activatedRoute.snapshot.paramMap.get("criteria");
        this.global.setLoading(true);
        // Set active inventory based on route
        this.inventoryId =
            +this.activatedRoute.snapshot.paramMap.get("inventoryId")! || 0;

        this.footprintStore.setCriteria(criteria || Constants.MUTLI_CRITERIA);

        const [footprint, filters, datacenters, physicalEquipments] = await Promise.all([
            firstValueFrom(this.footprintDataService.getFootprint(this.inventoryId)),
            firstValueFrom(this.footprintDataService.getFilters(this.inventoryId)),
            firstValueFrom(this.footprintDataService.getDatacenters(this.inventoryId)),
            firstValueFrom(
                this.footprintDataService.getPhysicalEquipments(this.inventoryId),
            ),
        ]);

        this.allUnmodifiedFootprint = footprint;
        this.allUnmodifiedDatacenters = datacenters;
        this.allUnmodifiedEquipments = physicalEquipments;
        this.allUnmodifiedFilters = {};
        Constants.EQUIPMENT_FILTERS.forEach((field) => {
            this.allUnmodifiedFilters[field] = [
                Constants.ALL,
                ...filters[Constants.EQUIPMENT_FILTERS_MAP[field]!]
                    .map((item) => (item !== "" ? item : Constants.EMPTY))
                    .sort(),
            ];
        });

        this.global.setLoading(false);

        // React on criteria url param change
        this.activatedRoute.paramMap.subscribe((params) => {
            const criteria = params.get("criteria")!;
            this.footprintStore.setCriteria(criteria);

            if (criteria !== Constants.MUTLI_CRITERIA) {
                this.allUnmodifiedCriteriaFootprint =
                    this.allUnmodifiedFootprint[criteria];
            }
        });
    }
}
