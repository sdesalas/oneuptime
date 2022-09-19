import DatabaseRequestType from "../Types/Database/DatabaseRequestType";
import Permission, {
    PermissionHelper,
    UserPermission,
} from 'Common/Types/Permission';
import BaseModel from "Common/Models/BaseModel";
import DatabaseCommonInteractionProps from 'Common/Types/Database/DatabaseCommonInteractionProps';
import NotAuthorizedException from 'Common/Types/Exception/NotAuthorizedException';
import Query from "../Types/Database/Query";
import Select from "../Types/Database/Select";
import BadDataException from "Common/Types/Exception/BadDataException";
import QueryHelper from "../Types/Database/QueryHelper";
import Columns from "Common/Types/Database/Columns";
import Dictionary from "Common/Types/Dictionary";
import { ColumnAccessControl } from "Common/Types/Database/AccessControl/AccessControl";
import Populate from "../Types/Database/Populate";
import Typeof from "Common/Types/Typeof";
import { TableColumnMetadata } from "Common/Types/Database/TableColumn";
import TableColumnType from "Common/Types/Database/TableColumnType";
import ObjectID from "Common/Types/ObjectID";
import LessThan from 'Common/Types/Database/LessThan';
import GreaterThan from 'Common/Types/Database/GreaterThan';
import GreaterThanOrEqual from 'Common/Types/Database/GreaterThanOrEqual';
import LessThanOrEqual from 'Common/Types/Database/LessThanOrEqual';
import InBetween from 'Common/Types/Database/InBetween';
import NotNull from 'Common/Types/Database/NotNull';
import Search from "Common/Types/Database/Search";
import { FindOperator } from "typeorm";
import { JSONObject } from "Common/Types/JSON";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

export default class ModelPermission {


    public static checkDeletePermission<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, query: Query<TBaseModel>, props: DatabaseCommonInteractionProps): Query<TBaseModel> {
        if (!props.isRoot) {
            this.checkModelLevelPermissions(modelType, props, DatabaseRequestType.Delete);
            query = this.addTenantScopeToQuery(modelType, query, props);
        }

        return query;
    }


    public static checkUpdatePermissions<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, query: Query<TBaseModel>,  data: QueryDeepPartialEntity<TBaseModel>, props: DatabaseCommonInteractionProps): Query<TBaseModel> { 
        if (props.isRoot) {
            return query;
        }

        this.checkModelLevelPermissions(modelType, props, DatabaseRequestType.Update);

        query = this.checkReadPermission(modelType, query, null, null, props).query;

        this.checkDataColumnPermissions(modelType, data as any, props, DatabaseRequestType.Update);

        return query;
    }

    public static checkCreatePermissions<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, data: TBaseModel, props: DatabaseCommonInteractionProps): void { 
        // If system is making this query then let the query run!
        if (props.isRoot) {
            return;
        }

        this.checkModelLevelPermissions(modelType, props, DatabaseRequestType.Create);

        this.checkDataColumnPermissions(modelType, data, props, DatabaseRequestType.Create);
        
    }

    private static checkDataColumnPermissions<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, data: TBaseModel, props: DatabaseCommonInteractionProps, requestType: DatabaseRequestType): void {

        const model = new modelType();
        const userPermissions: Array<UserPermission> = this.getUserPermissions(
            props
        );

        const permissionColumns = this.getModelColumnsByPermissions(modelType, userPermissions, requestType);

        for (const key of Object.keys(data)) {
            
            if (
                !permissionColumns.columns.includes(key)
            ) {
                throw new BadDataException(
                    `User is not allowed to ${requestType} on ${key} column of ${model.singularName}`
                );
            }
        }
    }




    public static checkReadPermission<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, query: Query<TBaseModel>, select: Select<TBaseModel> | null, populate: Populate<TBaseModel> | null, props: DatabaseCommonInteractionProps): {
        query: Query<TBaseModel>;
        select: Select<TBaseModel> | null;
        populate: Populate<TBaseModel> | null;
    } {
        const model = new modelType();

        if (!props.isRoot) {
            // check model level permissions. 
            this.checkModelLevelPermissions(modelType, props, DatabaseRequestType.Read);

            // add tenant scope. 
            query = this.addTenantScopeToQuery(modelType, query, props);

            // check query permissions. 
            this.checkQueryPermission(modelType, query, props);

            if (model.getAccessControlColumn()) {

                const accessControlIds: Array<ObjectID> = this.getAccessControlIdsForQuery(modelType, query, select, props);

                if (accessControlIds.length > 0) {
                    (query as any)[model.getAccessControlColumn() as string] = accessControlIds;
                }
            }

            if (select) {
                // check query permission. 
                this.checkSelectPermission(modelType, select, props);
            }

            if (populate) {
                this.checkPopulatePermission(modelType, populate, props);
            }
        }

        if (select && populate) {
            const result = this.sanitizePopulateAndSelect(select, populate);
            select = result.select;
            populate = result.populate;
        }

        // check label permissons. 

        query = this.serializeQuery(modelType, query);

        return { query, select, populate };

    }

    private static serializeQuery<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, query: Query<TBaseModel>): Query<TBaseModel> {
        const model = new modelType();

        for (const key in query) {
            const tableColumnMetadata: TableColumnMetadata =
                model.getTableColumnMetadata(key);

            if (tableColumnMetadata && query[key] === null) {
                query[key] = QueryHelper.isNull();
            }
            else if (query[key] && query[key] instanceof NotNull &&
                tableColumnMetadata) {
                console.log("here");
                query[key] = QueryHelper.notNull();
            }
            else if (
                query[key] &&
                (query[key] as any)._value &&
                Array.isArray((query[key] as any)._value) &&
                (query[key] as any)._value.length > 0 &&
                tableColumnMetadata
            ) {
                let counter: number = 0;
                for (const item of (query[key] as any)._value) {
                    if (item instanceof ObjectID) {
                        ((query[key] as any)._value as any)[counter] = (
                            (query[key] as any)._value as any
                        )[counter].toString();
                    }
                    counter++;
                }
            } else if (query[key] && query[key] instanceof ObjectID &&
                tableColumnMetadata) {
                query[key] = QueryHelper.equalTo(
                    (query[key] as ObjectID).toString() as any
                ) as any;
            } else if (query[key] && query[key] instanceof Search &&
                tableColumnMetadata) {
                query[key] = QueryHelper.search(
                    (query[key] as Search).toString() as any
                ) as any;
            } else if (query[key] && query[key] instanceof LessThan &&
                tableColumnMetadata) {
                query[key] = QueryHelper.lessThan(
                    (query[key] as LessThan).toString() as any
                ) as any;
            } else if (query[key] && query[key] instanceof InBetween &&
                tableColumnMetadata) {
                query[key] = QueryHelper.inBetween(
                    (query[key] as InBetween).startValue as any,
                    (query[key] as InBetween).endValue as any
                ) as any;
            } else if (query[key] && query[key] instanceof GreaterThan &&
                tableColumnMetadata) {
                query[key] = QueryHelper.greaterThan(
                    (query[key] as GreaterThan).toString() as any
                ) as any;
            } else if (query[key] && query[key] instanceof GreaterThanOrEqual &&
                tableColumnMetadata) {
                query[key] = QueryHelper.greaterThanEqualTo(
                    (query[key] as GreaterThanOrEqual).toString() as any
                ) as any;
            } else if (query[key] && query[key] instanceof LessThanOrEqual &&
                tableColumnMetadata) {
                query[key] = QueryHelper.lessThanEqualTo(
                    (query[key] as LessThanOrEqual).toString() as any
                ) as any;
            } else if (
                query[key] &&
                Array.isArray(query[key])
                &&
                tableColumnMetadata &&
                tableColumnMetadata.type !== TableColumnType.EntityArray
            ) {



                query[key] = QueryHelper.in(
                    query[key] as any
                ) as FindOperator<any> as any;
            }

            if (
                tableColumnMetadata &&
                tableColumnMetadata.manyToOneRelationColumn &&
                typeof query[key] === Typeof.String
            ) {
                (query as any)[tableColumnMetadata.manyToOneRelationColumn] =
                    query[key] as string;
                delete query[key];
            }

            if (
                tableColumnMetadata &&
                tableColumnMetadata.modelType &&
                tableColumnMetadata.type === TableColumnType.EntityArray &&
                Array.isArray(query[key])
            ) {

                query[key] = (query[key] as Array<string | JSONObject>).map((item) => {
                    if (typeof item === Typeof.String) {
                        return item;
                    }

                    if ((item) && (item as JSONObject)["_id"]) {
                        return (item as JSONObject)["_id"] as string;
                    }

                    return item;
                }) as any;

                (query as any)[key] = {
                    _id: QueryHelper.in(query[key] as Array<string>),
                };
            }
        }

        return query;
    }


    private static getAccessControlIdsForQuery<TBaseModel extends BaseModel>(modelType: { new(): BaseModel }, query: Query<TBaseModel>, select: Select<TBaseModel> | null, props: DatabaseCommonInteractionProps): Array<ObjectID> {
        const model = new modelType();
        let labelIds: Array<ObjectID> = [];

        let userPermissions: Array<UserPermission> = this.getUserPermissions(props);

        let nonAccessControlPermissionPermission: Array<Permission> = PermissionHelper.getNonAccessControlPermissions(userPermissions);

        let accessControlPermissions: Array<UserPermission> = PermissionHelper.getAccessControlPermissions(userPermissions);

        let columnsToCheckPermissionFor = Object.keys(query);

        if (select) {
            columnsToCheckPermissionFor = [...columnsToCheckPermissionFor, ...Object.keys(select)];
        }

        for (const column of columnsToCheckPermissionFor) {
            const accessControl: ColumnAccessControl | null =
                model.getColumnAccessControlFor(column);

            if (!accessControl) {
                continue;
            }


            if (!PermissionHelper.doesPermissionsIntersect(accessControl.read, nonAccessControlPermissionPermission)) {
                // If this does not intersect, have access control permission. 

                // get intersecting permissions 
                for (const readPermissions of accessControl.read) {
                    for (const accessControlPermission of accessControlPermissions) {
                        if (accessControlPermission.permission === readPermissions && accessControlPermission.labelIds.length > 0) {
                            labelIds = [...labelIds, ...accessControlPermission.labelIds];
                        }
                    }
                }
            }
        }

        return labelIds;

    }

    private static sanitizePopulateAndSelect<TBaseModel extends BaseModel>(select: Select<TBaseModel>, populate: Populate<TBaseModel>): {
        select: Select<TBaseModel>; populate: Populate<TBaseModel>
    } {


        for (const key in populate) {
            if (typeof populate[key] === Typeof.Object) {

                (select as any)[key] = (
                    populate as any
                )[key];

                (populate as any)[key] = true;

            } else {
                // if you want to populate the whole object, you only do the id because of security.
                (select as any)[key] = {
                    _id: true,
                } as any;
                (populate as any)[key] = true;
            }
        }

        return { select, populate };
    }

    private static checkPopulatePermission<TBaseModel extends BaseModel>(modelType: { new(): BaseModel }, populate: Populate<TBaseModel>, props: DatabaseCommonInteractionProps): void {

        const model = new modelType();
        const userPermissions: Array<Permission> = this.getUserPermissions(
            props
        ).map((i) => i.permission);

        for (const key in populate) {
            if (typeof populate[key] === Typeof.Object) {
                const tableColumnMetadata: TableColumnMetadata =
                    model.getTableColumnMetadata(key);

                if (!tableColumnMetadata.modelType) {
                    throw new BadDataException(
                        'Populate not supported on ' +
                        key +
                        ' of ' +
                        model.singularName +
                        ' because this column modelType is not found.'
                    );
                }

                const relatedModel: BaseModel =
                    new tableColumnMetadata.modelType();

                if (
                    tableColumnMetadata.type === TableColumnType.Entity ||
                    tableColumnMetadata.type === TableColumnType.EntityArray
                ) {
                    for (const innerKey in (populate as any)[
                        key
                    ]) {
                        // check for permissions.
                        if (
                            typeof (populate as any)[key][
                            innerKey
                            ] === Typeof.Object
                        ) {
                            throw new BadDataException(
                                'Nested populate not supported'
                            );
                        }

                        // check if the user has permission to read this column
                        if (userPermissions) {
                            const hasPermission: boolean =
                                relatedModel.hasReadPermissions(
                                    userPermissions,
                                    innerKey
                                );

                            if (!hasPermission) {
                                let readPermissions: Array<Permission> = [];
                                if (
                                    relatedModel.getColumnAccessControlFor(
                                        innerKey
                                    )
                                ) {
                                    readPermissions =
                                        relatedModel.getColumnAccessControlFor(
                                            innerKey
                                        )!.read;
                                }

                                throw new NotAuthorizedException(
                                    `You do not have permissions to read ${key}.${innerKey} on ${model.singularName}. You need one of these permissions: ${PermissionHelper.getPermissionTitles(
                                        readPermissions
                                    ).join(',')}`
                                );
                            }
                        }
                    }
                } else {
                    throw new BadDataException(
                        'Populate not supported on ' +
                        key +
                        ' of ' +
                        model.singularName +
                        ' because this column is not of type Entity or EntityArray'
                    );
                }
            }
        }
    }


    private static checkQueryPermission<TBaseModel extends BaseModel>(modelType: { new(): BaseModel }, query: Query<TBaseModel>, props: DatabaseCommonInteractionProps): void {


        const model = new modelType();

        const userPermissions: Array<UserPermission> = this.getUserPermissions(
            props
        );

        let canReadOnTheseColumns: Columns = this.getModelColumnsByPermissions(modelType, userPermissions || [], DatabaseRequestType.Read);

        const tableColumns: Array<string> =
            model.getTableColumns().columns;

        const excludedColumns: Array<string> = [
            '_id',
            'createdAt',
            'deletedAt',
            'updatedAt',
        ];

        // Now we need to check all columns.

        for (const key in query) {
            if (excludedColumns.includes(key)) {
                continue;
            }

            if (!canReadOnTheseColumns.columns.includes(key)) {
                if (!tableColumns.includes(key)) {
                    throw new BadDataException(
                        `Invalid column on ${model.singularName} - ${key}. Column does not exist.`
                    );
                }

                throw new NotAuthorizedException(
                    `You do not have permissions to query on - ${key}. You need any one of these permissions: ${PermissionHelper.getPermissionTitles(
                        model.getColumnAccessControlFor(key)
                            ? model.getColumnAccessControlFor(key)!.read
                            : []
                    ).join(',')}`
                );
            }
        }
    }


    private static addTenantScopeToQuery<TBaseModel extends BaseModel>(modelType: { new(): TBaseModel }, query: Query<TBaseModel>, props: DatabaseCommonInteractionProps): Query<TBaseModel> {

        const model = new modelType();

        const tenantColumn: string | null = model.getTenantColumn();

        if (
            props.isMultiTenantRequest &&
            !model.canQueryMultiTenant()
        ) {
            throw new BadDataException(
                `isMultiTenantRequest not allowed on ${model.singularName}`
            );
        }

        // If this model has a tenantColumn, and request has tenantId, and is multiTenantQuery null then add tenantId to query.
        if (
            tenantColumn &&
            props.tenantId &&
            !props.isMultiTenantRequest
        ) {
            (query as any)[tenantColumn] = props.tenantId;
        } else if (
            model.isUserQueryWithoutTenantAllowed() &&
            model.getUserColumn() &&
            props.userId
        ) {
            (query as any)[model.getUserColumn() as string] =
                props.userId;
        } else if (
            tenantColumn &&
            !props.tenantId &&
            props.userGlobalAccessPermission
        ) {
            (query as any)[tenantColumn] = QueryHelper.in(
                props.userGlobalAccessPermission?.projectIds
            );
        }

        return query;

    }

    private static getModelColumnsByPermissions<TBaseModel extends BaseModel>(
        modelType: { new(): TBaseModel },
        userPermissions: Array<UserPermission>,
        requestType: DatabaseRequestType
    ): Columns {
        const model = new modelType();
        const accessControl: Dictionary<ColumnAccessControl> =
            model.getColumnAccessControlForAllColumns();

        const columns: Array<string> = [];

        const permissions: Array<Permission> = userPermissions.map(
            (item: UserPermission) => {
                return item.permission;
            }
        );

        for (const key in accessControl) {

            let columnPermissions: Array<Permission> = [];


            if (requestType === DatabaseRequestType.Read) {
                columnPermissions = accessControl[key]?.read || [];
            }

            if (requestType === DatabaseRequestType.Create) {
                columnPermissions = accessControl[key]?.create || [];
            }

            if (requestType === DatabaseRequestType.Update) {
                columnPermissions = accessControl[key]?.update || [];
            }

            if (requestType === DatabaseRequestType.Delete) {
                throw new BadDataException("Invalid request type delete");
            }

            if (
                columnPermissions &&
                PermissionHelper.doesPermissionsIntersect(
                    permissions,
                    columnPermissions
                )
            ) {
                columns.push(key);
            }
        }

        return new Columns(columns);
    }


    private static checkSelectPermission<TBaseModel extends BaseModel>(modelType: { new(): BaseModel }, select: Select<TBaseModel>, props: DatabaseCommonInteractionProps): void {

        const model = new modelType();

        const userPermissions: Array<UserPermission> = this.getUserPermissions(
            props
        );

        let canReadOnTheseColumns: Columns = this.getModelColumnsByPermissions(modelType, userPermissions || [], DatabaseRequestType.Read);

        const tableColumns: Array<string> =
            model.getTableColumns().columns;

        const excludedColumns: Array<string> = [
            '_id',
            'createdAt',
            'deletedAt',
            'updatedAt',
        ];


        for (const key in select) {
            if (excludedColumns.includes(key)) {
                continue;
            }

            if (!canReadOnTheseColumns.columns.includes(key)) {
                if (!tableColumns.includes(key)) {
                    throw new BadDataException(
                        `Cannnot select on ${key}. This column does not exist on ${model.singularName}`
                    );
                }

                throw new NotAuthorizedException(
                    `You do not have permissions to select on - ${key}.
                    You need any one of these permissions: ${PermissionHelper.getPermissionTitles(
                        model.getColumnAccessControlFor(key)
                            ? model.getColumnAccessControlFor(key)!.read
                            : []
                    ).join(',')}`
                );
            }
        }
    }

    private static getModelPermissions(modelType: { new(): BaseModel }, type: DatabaseRequestType): Array<Permission> {

        let modelPermissions: Array<Permission> = [];
        let model = new modelType();

        if (type === DatabaseRequestType.Create) {
            modelPermissions = model.createRecordPermissions;
        }

        if (type === DatabaseRequestType.Update) {
            modelPermissions = model.updateRecordPermissions;
        }

        if (type === DatabaseRequestType.Delete) {
            modelPermissions = model.deleteRecordPermissions;
        }

        if (type === DatabaseRequestType.Read) {
            modelPermissions = model.readRecordPermissions;
        }

        return modelPermissions;
    }

    private static isPublicPermissionAllowed(modelType: { new(): BaseModel }, type: DatabaseRequestType) {
        let isPublicAllowed: boolean = false;
        isPublicAllowed = this.getModelPermissions(modelType, type).includes(Permission.Public);
        return isPublicAllowed;
    }

    private static checkModelLevelPermissions(modelType: { new(): BaseModel }, props: DatabaseCommonInteractionProps,
        type: DatabaseRequestType): void {

        // 1 CHECK: PUBLIC check -- Check if this is a public request and if public is allowed. 

        if (!this.isPublicPermissionAllowed(modelType, type) && !props.userId) {
            // this means the record is not publicly createable and the user is not logged in.
            throw new NotAuthorizedException(
                `A user should be logged in to ${type} record of ${new modelType().singularName}.`
            );
        }

        // 2nd CHECK: Does user have access to CRUD data on this model. 
        const userPermissions: Array<UserPermission> = this.getUserPermissions(props);
        const modelPermissions: Array<Permission> = this.getModelPermissions(modelType, type);


        if (
            !PermissionHelper.doesPermissionsIntersect(
                userPermissions.map(
                    (userPermission: UserPermission) => {
                        return userPermission.permission;
                    }
                ) || [],
                modelPermissions
            )
        ) {
            throw new NotAuthorizedException(
                `You do not have permissions to ${type} ${new modelType().singularName}. You need one of these permissions: ${PermissionHelper.getPermissionTitles(
                    modelPermissions
                ).join(',')}`
            );
        }
    }

    private static getUserPermissions(
        props: DatabaseCommonInteractionProps,
    ): Array<UserPermission> {


        // Check first if the user has Global Permissions. 
        // Global permissions includes all the tenantId user has access to.
        // and it includes all the global permissions that applies to all the tenant, like PUBLIC. 
        if (!props.userGlobalAccessPermission) {
            throw new NotAuthorizedException(`Permissions not found.`);
        }


        // If the PUBLIC Permission is not found in global permissions, include it. 
        if (
            props.userGlobalAccessPermission &&
            !props.userGlobalAccessPermission.globalPermissions.includes(
                Permission.Public
            )
        ) {
            props.userGlobalAccessPermission.globalPermissions.push(
                Permission.Public
            ); // add public permission if not already.
        }

        // If the CurrentUser Permission is not found in global permissions, include it. 
        if (
            props.userId &&
            props.userGlobalAccessPermission &&
            !props.userGlobalAccessPermission.globalPermissions.includes(
                Permission.CurrentUser
            )
        ) {
            props.userGlobalAccessPermission.globalPermissions.push(
                Permission.CurrentUser
            );
        }

        let userPermissions: Array<UserPermission> = [];

        // Include global permission in userPermissions. 

        if (props.userGlobalAccessPermission) {
            /// take gloabl permissions.
            userPermissions =
                props.userGlobalAccessPermission.globalPermissions.map(
                    (permission: Permission) => {
                        return {
                            permission: permission,
                            labelIds: [],
                            _type: 'UserPermission',
                        };
                    }
                );
        }


        if (props.tenantId && props.userTenantAccessPermission) {
            // Include Tenant Permission in userPermissions. 
            userPermissions = [...userPermissions, ...props.userTenantAccessPermission.permissions];
        }


        return userPermissions;
    }
}