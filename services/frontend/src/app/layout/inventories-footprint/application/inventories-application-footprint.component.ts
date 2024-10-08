/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
import { Component, computed, inject, signal, Signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { MenuItem } from "primeng/api";
import { finalize, firstValueFrom } from "rxjs";
import {
    ConstantApplicationFilter,
    Filter,
    TransformedDomain,
    TransformedDomainItem,
} from "src/app/core/interfaces/filter.interface";
import {
    ApplicationCriteriaFootprint,
    ApplicationFootprint,
} from "src/app/core/interfaces/footprint.interface";
import { FootprintService } from "src/app/core/service/business/footprint.service";
import { FootprintDataService } from "src/app/core/service/data/footprint-data.service";
import { FootprintStoreService } from "src/app/core/store/footprint.store";
import { GlobalStoreService } from "src/app/core/store/global.store";
import * as LifeCycleUtils from "src/app/core/utils/lifecycle";
import { Constants } from "src/constants";

@Component({
    selector: "app-inventories-application-footprint",
    templateUrl: "./inventories-application-footprint.component.html",
})
export class InventoriesApplicationFootprintComponent {
    protected footprintStore = inject(FootprintStoreService);
    private globalStore = inject(GlobalStoreService);
    footprintDataService = inject(FootprintDataService);

    selectedCriteria: string = "";
    criteres: MenuItem[] = [];
    showTabMenu = false;
    criterias = [
        Constants.MUTLI_CRITERIA,
        ...Object.keys(this.globalStore.criteriaList()),
    ];
    inventoryId!: number;
    multiCriteria = Constants.MUTLI_CRITERIA;
    allUnmodifiedFilters = signal({});
    savedFilers: Filter<string | TransformedDomain> = {};
    filteredFilters: Signal<Filter<string | TransformedDomain>> = computed(() => {
        return this.getFilteredFilters(
            this.allUnmodifiedFilters(),
            this.footprintStore.appGraphType(),
            this.footprintStore.appDomain(),
            this.footprintStore.appSubDomain(),
        );
    });
    footprint: ApplicationFootprint[] = [];
    allUnmodifiedFootprint: ApplicationFootprint[] = [];
    filterFields = Constants.APPLICATION_FILTERS;

    constructor(
        private activatedRoute: ActivatedRoute,
        public footprintService: FootprintService,
        private translate: TranslateService,
    ) {}

    async ngOnInit() {
        const criteria = this.activatedRoute.snapshot.paramMap.get("criteria");
        this.globalStore.setLoading(true);
        // Set active inventory based on route
        this.inventoryId =
            +this.activatedRoute.snapshot.paramMap.get("inventoryId")! || 0;

        const footprint: ApplicationFootprint[] = await firstValueFrom(
            this.footprintService.initApplicationFootprint(this.inventoryId),
        );

        this.footprintStore.setApplicationCriteria(criteria || Constants.MUTLI_CRITERIA);
        this.footprintStore.setGraphType("global");
        this.footprint = footprint;
        this.allUnmodifiedFootprint = JSON.parse(JSON.stringify(footprint));
        this.footprint = this.footprint.map((footprintData) => ({
            ...footprintData,
            unit: this.translate.instant(`criteria.${footprintData.criteria}.unite`),
        }));

        const uniqueFilterSet = this.footprintService.getUniqueValues(
            this.footprint,
            Constants.APPLICATION_FILTERS,
            false,
        );

        let unmodifyFilter: Filter<string | TransformedDomain> = {};
        Constants.APPLICATION_FILTERS.forEach((filter) => {
            unmodifyFilter[filter.field] = [
                filter.field !== "domain"
                    ? Constants.ALL
                    : {
                          label: Constants.ALL,
                          checked: true,
                          visible: true,
                          children: [],
                      },
                ...this.getValues(uniqueFilterSet, filter),
            ];
        });
        this.allUnmodifiedFilters.set(unmodifyFilter);

        this.globalStore.setLoading(false);

        // React on criteria url param change
        this.activatedRoute.paramMap.subscribe((params) => {
            const criteria = params.get("criteria")!;
            this.footprintStore.setApplicationCriteria(criteria);
        });

        this.footprintService
            .initApplicationFootprint(this.inventoryId)
            .pipe(finalize(() => (this.showTabMenu = true)))
            .subscribe((applicationFootprints: ApplicationFootprint[]) => {
                this.criteres = applicationFootprints.map((footprint) => {
                    return {
                        label: this.translate.instant(
                            `criteria.${footprint.criteria}.title`,
                        ),
                        routerLink: `../${footprint.criteria}`,
                    };
                });

                if (this.criteres.length > 1) {
                    this.criteres.unshift({
                        label: "Multi-criteria",
                        routerLink: "../multi-criteria",
                    });
                }
            });
    }

    private getFilteredFilters(
        unmodifyFilter: Filter<string | TransformedDomain>,
        graphType: string,
        domain: string,
        subdomain: string,
    ): Filter<string | TransformedDomain> {
        let nonModifyFilter = { ...unmodifyFilter };
        if (graphType === "global") {
            return nonModifyFilter;
        }
        if (domain) {
            nonModifyFilter["domain"] = unmodifyFilter["domain"].filter(
                (d) =>
                    (d as TransformedDomain)?.label === domain ||
                    (d as TransformedDomain)?.label === Constants.ALL,
            );
        }
        if (subdomain) {
            nonModifyFilter["domain"] = unmodifyFilter["domain"]
                .filter(
                    (e) =>
                        (e as TransformedDomain).label === domain ||
                        (e as TransformedDomain).label === Constants.ALL,
                )
                .map((d) => {
                    if (!(d as TransformedDomain)?.label) {
                        return d;
                    }

                    return {
                        ...(d as TransformedDomain),
                        children: (d as TransformedDomain).children.filter(
                            (c: TransformedDomainItem) => c.label === subdomain,
                        ),
                    };
                });
        }
        if (graphType === "application") {
            let criteriaFootprint = this.allUnmodifiedFootprint.find(
                (item) => item.criteria === this.footprintStore.applicationCriteria(),
            );

            const appFilterConstant: ConstantApplicationFilter[] =
                Constants.APPLICATION_FILTERS.filter((f) => !f?.children);
            if (criteriaFootprint?.impacts) {
                criteriaFootprint.impacts = criteriaFootprint.impacts.filter(
                    (impact) =>
                        this.footprintStore.appApplication() === impact.applicationName,
                );
            }
            if (criteriaFootprint) {
                const uniqueFilters = this.footprintService.getUniqueValues(
                    [criteriaFootprint],
                    appFilterConstant,
                    false,
                );
                let modifiedFilter: Filter<string | TransformedDomain> = {};
                appFilterConstant.forEach((filter) => {
                    modifiedFilter[filter.field] = [
                        filter.field !== "domain"
                            ? Constants.ALL
                            : {
                                  label: Constants.ALL,
                                  checked: true,
                                  visible: true,
                                  children: [],
                              },
                        ...this.getValues(uniqueFilters, filter),
                    ];
                });
                nonModifyFilter = { ...nonModifyFilter, ...modifiedFilter };
            }
        }
        return nonModifyFilter;
    }

    private getValues(
        filters: {
            [key: string]: string[] | TransformedDomain[];
        },
        filter: ConstantApplicationFilter,
    ) {
        const filterItem = filters[filter.field];
        const lifecyleMap = LifeCycleUtils.getLifeCycleMap();

        return filterItem
            .map((item) => this.mapItem(item, filter, lifecyleMap))
            .map((item: any) => item || Constants.UNSPECIFIED)
            .sort();
    }

    private mapItem(
        item: string | TransformedDomain,
        filter: ConstantApplicationFilter,
        lifecyleMap: Map<string, string>,
    ): string | TransformedDomain {
        if (filter.translated) {
            return this.mapLifecycle(item as string, lifecyleMap);
        }
        return item !== "" ? item : Constants.EMPTY;
    }

    private mapLifecycle(lifecycle: string, lifecyleMap: Map<string, string>): string {
        return (
            this.translate.instant("acvStep." + lifecyleMap.get(lifecycle)) || lifecycle
        );
    }

    formatLifecycles(lifeCycles: string[]): string[] {
        const lifecycleMap = LifeCycleUtils.getLifeCycleMap();
        const lifecyclesList = Array.from(lifecycleMap.keys());

        return lifeCycles.map((lifeCycle) => {
            lifeCycle = lifeCycle.replace("acvStep.", "");
            if (
                lifeCycle !== Constants.ALL &&
                lifeCycle !== Constants.UNSPECIFIED &&
                lifecyclesList.includes(lifeCycle)
            ) {
                return this.translate.instant("acvStep." + lifecycleMap.get(lifeCycle));
            } else {
                return lifeCycle;
            }
        });
    }

    formatLifecycleImpact(footprint: ApplicationFootprint[]): ApplicationFootprint[] {
        const lifecycleMap = LifeCycleUtils.getLifeCycleMap();
        const lifecyclesList = Array.from(lifecycleMap.keys());

        return footprint.map((element) => {
            element.impacts.forEach((impact) => {
                if (
                    impact.lifeCycle !== Constants.ALL &&
                    impact.lifeCycle !== Constants.UNSPECIFIED &&
                    lifecyclesList.includes(impact.lifeCycle)
                ) {
                    impact.lifeCycle = this.translate.instant(
                        "acvStep." + lifecycleMap.get(impact.lifeCycle),
                    );
                }
            });
            return element;
        });
    }

    formatLifecycleCriteriaImpact(
        footprint: ApplicationCriteriaFootprint[],
    ): ApplicationCriteriaFootprint[] {
        const lifecycleMap = LifeCycleUtils.getLifeCycleMap();
        const lifecyclesList = Array.from(lifecycleMap.keys());

        footprint.forEach((element) => {
            element.impacts.forEach((impact) => {
                if (
                    impact.lifeCycle !== Constants.ALL &&
                    impact.lifeCycle !== Constants.UNSPECIFIED &&
                    lifecyclesList.includes(impact.lifeCycle)
                ) {
                    impact.lifeCycle = this.translate.instant(
                        "acvStep." + lifecycleMap.get(impact.lifeCycle),
                    );
                }
            });
        });
        return footprint;
    }
}
