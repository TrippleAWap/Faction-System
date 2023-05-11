import { world, system, ScoreboardIdentity } from "@minecraft/server";

const overworld = world.getDimension("overworld");
export class Database {
    /**
     * @param {string} databaseName - The name of the database
     */
    constructor(databaseName) {
        this.databaseName = databaseName;
        /**@private */
        this.objective = world.scoreboard.getObjective(databaseName) ?? world.scoreboard.addObjective(databaseName, "{}");
        /**@private */
        this.data = this.objective ? JSON.parse(this.objective.displayName) : {}
        /**@private */
        this.modified = false;
        /**@private */
        this.createProxy = (target) => {
            return new Proxy(target, {
                get: (target, key) => {
                    if (Array.isArray(target[key])) {
                        // If the property is an array, wrap it with a Proxy
                        return this.createProxy(target[key]);
                    } else {
                        return target[key];
                    }},
                set: (target, key, value) => {
                    target[key] = value;
                    if (!this.modified)
                        (this.modified = true) &&
                        system.run(() => {
                            this.save();
                            this.modified = false;
                        });
                    return true;},
                deleteProperty: (target, key) => {
                    delete target[key];
                    if (!this.modified)
                        (this.modified = true) &&
                        system.run(() => {
                            this.save();
                            this.modified = false;
                        });
                    return true;},
                has: (target, key) => {
                    return key in target;},
                ownKeys: (target) => {
                    return Reflect.ownKeys(target);},
            });
        }
        /**@private */
        this.proxy = this.createProxy(this.data);
    }

    /**
     * Get the entire data object of the database.
     * @returns {object} The data object of the database.
     */
    get all() {
        return this.proxy;
    }
