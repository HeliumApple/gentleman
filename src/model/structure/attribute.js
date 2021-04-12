import { valOrDefault } from "zenkai";
import { BaseStructure } from "./structure.js";


export const BaseAttribute = {
    /** @type {string} */
    object: "attribute",
    /** @type {*} */
    target: null,

    init(value) {
        this.target = this.model.createConcept(this.schema.target, {
            value: valOrDefault(value, this.schema.value),
            parent: this.concept,
            ref: this
        });

        return this;
    },
    getValue() {
        return this.target.getValue();
    },
    hasValue() {
        return this.target.hasValue();
    },


    copy() {
        if (!this.target.hasValue()) {
            return null;
        }
        
        return this.target.copy(false);
    },
    export() {
        if (!this.target.hasValue()) {
            return null;
        }

        let output = {
            id: this.target.id,
            name: this.target.name,
        };

        return output;
    },
    toString() {
        return {
            [`attribute.${this.name}`]: this.target.toString()
        };
    }
};


export const Attribute = Object.assign(
    Object.create(BaseStructure),
    BaseAttribute
);