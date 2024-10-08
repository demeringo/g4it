import { Role } from "./roles.interfaces";

export interface Subscriber {
    name?: string;
    defaultFlag?: boolean;
    id?: number;
    organizations?: Organization[];
    roles?: Role[];
    criteria?: string[];
}

export interface Organization {
    id: number;
    name: string;
    status: string;
    deletionDate: string;
    dataRetentionDay: number | null;
    defaultFlag: boolean;
    roles: Role[];
    uiStatus?: string;
    criteriaIs?: string[];
    criteriaDs?: string[];
}

export interface OrganizationUpsertRest {
    subscriberId: number;
    name: string;
    status: string | null;
    dataRetentionDay?: number | null;
}

export interface OrganizationWithSubscriber {
    subscriberName: string;
    subscriberId: number;
    organizationName: string;
    organizationId: number;
    status: string;
    dataRetentionDays: number;
    displayLabel: string;
    criteriaDs: string[];
    criteriaIs: string[];
}

export interface SubscriberCriteriaRest {
    criteria: string[];
}

export interface OrganizationCriteriaRest {
    subscriberId: number;
    name: string;
    status: string;
    dataRetentionDays: number;
    criteriaIs: string[];
    criteriaDs: string[];
}
