/*
 * G4IT
 * Copyright 2023 Sopra Steria
 *
 * This product includes software developed by
 * French Ecological Ministery (https://gitlab-forge.din.developpement-durable.gouv.fr/pub/numeco/m4g/numecoeval)
 */
import { Component, computed, inject, input, Signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { EChartsOption } from "echarts";
import { Filter } from "src/app/core/interfaces/filter.interface";
import {
    ApplicationFootprint,
    ApplicationImpact,
} from "src/app/core/interfaces/footprint.interface";
import { FilterService } from "src/app/core/service/business/filter.service";
import { FootprintStoreService } from "src/app/core/store/footprint.store";
import { Constants } from "src/constants";

@Component({
    selector: "app-application-criteria-pie-chart",
    templateUrl: "./application-criteria-pie-chart.component.html",
})
export class ApplicationCriteriaPieChartComponent {
    protected footprintStore = inject(FootprintStoreService);
    private filterService = inject(FilterService);
    isSip: boolean = true;
    selectedCriteria = input({
        name: "",
        unite: "",
    });
    footprint = input<ApplicationFootprint[]>([]);
    noData: boolean = false;

    lifecycleOptions: Signal<EChartsOption> = computed(() => {
        return this.initLifecycleGraph(
            this.footprintStore.applicationSelectedFilters(),
            this.footprint(),
        );
    });

    envOptions: Signal<EChartsOption> = computed(() => {
        return this.initEnvGraph(
            this.footprintStore.applicationSelectedFilters(),
            this.footprint(),
        );
    });

    constructor(private translate: TranslateService) {}

    initLifecycleGraph(selectedFilters: Filter, footprint: ApplicationFootprint[]) {
        const data: any[] = [];
        const lifecyles: string[] = [];
        const criteriaFootprint = footprint.find(
            (item) => item.criteria === this.footprintStore.applicationCriteria(),
        );

        if (criteriaFootprint) {
            criteriaFootprint.impacts.forEach((impact: any) => {
                if (this.filterService.getFilterincludes(selectedFilters, impact)) {
                    switch (this.footprintStore.appGraphType()) {
                        case "global":
                            if (!lifecyles.includes(impact.lifeCycle)) {
                                lifecyles.push(impact.lifeCycle);
                                data.push({
                                    name: impact.lifeCycle,
                                    value: impact.sip,
                                });
                            } else {
                                const index = lifecyles.indexOf(impact.lifeCycle);
                                data[index].value += impact.sip;
                            }
                            break;
                        case "domain":
                            if (this.footprintStore.appDomain() === impact.domain) {
                                if (!lifecyles.includes(impact.lifeCycle)) {
                                    lifecyles.push(impact.lifeCycle);
                                    data.push({
                                        name: impact.lifeCycle,
                                        value: impact.sip,
                                    });
                                } else {
                                    const index = lifecyles.indexOf(impact.lifeCycle);
                                    data[index].value += impact.sip;
                                }
                            }
                            break;
                        case "subdomain":
                            if (
                                this.footprintStore.appDomain() === impact.domain &&
                                this.footprintStore.appSubDomain() === impact.subDomain
                            ) {
                                if (!lifecyles.includes(impact.lifeCycle)) {
                                    lifecyles.push(impact.lifeCycle);
                                    data.push({
                                        name: impact.lifeCycle,
                                        value: impact.sip,
                                    });
                                } else {
                                    const index = lifecyles.indexOf(impact.lifeCycle);
                                    data[index].value += impact.sip;
                                }
                            }
                            break;
                        case "application":
                            if (
                                this.footprintStore.appDomain() === impact.domain &&
                                this.footprintStore.appSubDomain() === impact.subDomain &&
                                this.footprintStore.appApplication() ===
                                    impact.applicationName
                            ) {
                                if (!lifecyles.includes(impact.lifeCycle)) {
                                    lifecyles.push(impact.lifeCycle);
                                    data.push({
                                        name: impact.lifeCycle,
                                        value: impact.sip,
                                    });
                                } else {
                                    const index = lifecyles.indexOf(impact.lifeCycle);
                                    data[index].value += impact.sip;
                                }
                            }
                            break;
                    }
                }
            });
        }

        return {
            aria: {
                enabled: true,
                label: {
                    description: `${this.translate.instant(
                        "inventories-footprint.application.graph-lifecycle",
                    )}`,
                },
            },
            series: [
                {
                    type: "pie",
                    data: data,
                    radius: "70%",
                    color: Constants.GREEN_COLOR_SET,
                    label: {
                        show: true,
                        formatter: (params: any) => {
                            return `${params.name}\n${params.percent!.toFixed(1)}%`;
                        },
                    },
                },
            ],
        };
    }

    initEnvGraph(selectedFilters: Filter, footprint: ApplicationFootprint[]) {
        const data: any[] = [];
        const environments: string[] = [];

        const criteriaFootprint = footprint.find(
            (item) => item.criteria === this.footprintStore.applicationCriteria(),
        );

        if (criteriaFootprint) {
            criteriaFootprint.impacts.forEach((impact: ApplicationImpact) => {
                if (
                    selectedFilters["environment"]?.includes(impact.environment) &&
                    selectedFilters["equipmentType"]?.includes(impact.equipmentType) &&
                    selectedFilters["lifeCycle"]?.includes(impact.lifeCycle) &&
                    this.footprintStore.appApplication() === impact.applicationName
                ) {
                    if (!environments.includes(impact.environment)) {
                        environments.push(impact.environment);
                        data.push({
                            name: impact.environment,
                            value: impact.sip,
                        });
                    } else {
                        const index = environments.indexOf(impact.environment);
                        data[index].value += impact.sip;
                    }
                }
            });
        }

        return {
            aria: {
                enabled: true,
                label: {
                    description: `${this.translate.instant(
                        "inventories-footprint.application.graph-env",
                    )}`,
                },
            },
            series: [
                {
                    type: "pie",
                    data: data,
                    radius: "70%",
                    color: Constants.PURPLE_COLOR_SET,
                    label: {
                        show: true,
                        formatter: (params: any) => {
                            return `${params.name}\n${params.percent!.toFixed(1)}%`;
                        },
                    },
                },
            ],
        };
    }
}
