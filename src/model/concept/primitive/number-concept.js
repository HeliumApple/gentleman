import { isNullOrWhitespace, isObject, isEmpty, isNullOrUndefined, valOrDefault } from "zenkai";
import { Concept } from "./../concept.js";


const ResponseCode = {
    SUCCESS: 200,
    INVALID_NUMBER: 400,
    INVALID_VALUE: 401,
    MIN_ERROR: 402,
    MAX_ERROR: 403,
};

function responseHandler(code) {
    switch (code) {
        case ResponseCode.INVALID_NUMBER:
            return {
                success: false,
                message: "The value is not a number."
            };
        case ResponseCode.INVALID_VALUE:
            return {
                success: false,
                message: "The value is not included in the list of valid values."
            };
        case ResponseCode.MAX_ERROR:
            return {
                success: false,
                message: `The value is greater than the maximum allowed: ${this.max}.`
            };
        case ResponseCode.MIN_ERROR:
            return {
                success: false,
                message: `The value is less than the minimum allowed: ${this.min}.`
            };
    }
}

const _NumberConcept = {
    nature: 'primitive',

    init(args = {}) {
        this.parent = args.parent;
        this.ref = args.ref;
        this.values = valOrDefault(this.schema.values, []);
        this.alias = this.schema.alias;
        this.description = this.schema.description;
        this.min = this.schema.min;
        this.max = this.schema.max;

        this.initObserver();
        this.initAttribute();
        this.initValue(args.value);

        return this;
    },
    initValue(args) {
        if (isNullOrUndefined(args)) {
            this.value = "";
            return this;
        }

        if (isObject(args)) {
            this.id = args.id;
            this.setValue(args.value);
        } else {
            this.setValue(args);
        }

        return this;
    },
    hasValue() {
        return !isNullOrWhitespace(this.value);
    },
    getValue() {
        return this.value;
    },
    setValue(value) {
        var result = this.validate(value);

        if (result !== ResponseCode.SUCCESS) {
            return {
                success: false,
                message: "Validation failed: The value could not be updated.",
                errors: [
                    responseHandler.call(this, result).message
                ]
            };
        }

        this.value = value;
        this.notify("value.changed", value);

        return {
            success: true,
            message: "The value has been successfully updated."
        };
    },

    getCandidates() {
        this.values.forEach(value => {
            if (isObject(value)) {
                value.type = "value";
            }
        });

        return this.values;
    },
    getChildren(name) {
        return [];
    },

    update(message, value) {
        return true;
    },
    validate(value) {
        if (isNaN(value)) {
            return ResponseCode.INVALID_NUMBER;
        }

        if (this.min && value < this.min) {
            return ResponseCode.MIN_ERROR;
        }

        if (this.max && value > this.max) {
            return ResponseCode.MAX_ERROR;
        }

        if (isNullOrWhitespace(value) || isEmpty(this.values)) {
            return ResponseCode.SUCCESS;
        }

        var found = false;
        for (let i = 0; !found && i < this.values.length; i++) {
            const val = this.values[i];
            if (isObject(val)) {
                found = val.value == value;
            } else {
                found = val == value;
            }
        }

        if (!found) {
            return ResponseCode.INVALID_VALUE;
        }

        return ResponseCode.SUCCESS;
    },

    build() {
        return this.getValue();
    },
    export() {
        return {
            id: this.id,
            name: this.name,
            root: this.isRoot(),
            value: this.hasValue() ? +this.getValue() : null
        };
    },
};


export const NumberConcept = Object.assign(
    Object.create(Concept),
    _NumberConcept
);