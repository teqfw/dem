// @ts-check
/** Host-owned RDB configuration initialized with the compiled model and connection. */
export class Configuration {
    constructor() {
        /** @type {{model: any, knex: any} | undefined} */
        let options;
        /** @param {{model: any, knex: any}} value */
        this.set = value => { options = value; };
        this.get = async () => {
            if (!options) throw new Error('Host is not configured.');
            return options;
        };
    }
}

/** Select DEM-RDB at the repository provider boundary. */
export function Preprocessor() {
    /** @param {any} id */
    return id => id.address === 'TeqFw_Dem_Api_RepositoryProvider'
        ? {...id, address: 'TeqFw_DemRdb_Provider'}
        : id.address === 'TeqFw_DemRdb_Api_Configuration'
            ? {...id, address: 'Host_Sqlite', exportName: 'Configuration'}
            : id;
}
