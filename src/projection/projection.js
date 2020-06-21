import {
    createSpan, createDiv, createI, createInput, createUnorderedList, createListItem,
    createDocFragment, createTable, createTableRow, createTableCell, createButton,
    appendChildren, removeChildren, insertAfterElement, insertBeforeElement,
    isNode, isHTMLElement, isNullOrWhitespace, isObject, isString, isNullOrUndefined,
    hasOwn, valOrDefault, getElement
} from "zenkai";
import { FieldFactory } from "./field/factory.js";
import { hide, show } from "@utils/index.js";


const SymbolResolver = {
    '#': resolveStructure,
    '$': resolveReference,
    '@': resolveScope,
};

const LayoutHandler = {
    'stack': stackHandler,
    'wrap': wrapHandler,
    'table': tableHandler,
    'grid': stackHandler,
    'relative': stackHandler,
    'field': fieldHandler,
    'template': fieldHandler,
    'text': textHandler,
};

export const Projection = {
    create: function (schema, concept, editor) {
        const instance = Object.create(this);

        instance.schema = schema;
        instance.concept = concept;
        instance.editor = editor;
        instance.containers = [];
        instance.attributes = [];
        instance.components = [];

        return instance;
    },
    schema: null,
    /** @type {Concept} */
    concept: null,
    /** @type {Editor} */
    editor: null,
    /** @type {Projection} */
    parent: null,
    /** @type {HTMLElement[]} */
    containers: null,
    /** @type {HTMLElement} */
    container: null,
    /** @type {HTMLElement} */
    btnNext: null,
    /** @type {HTMLElement} */
    btnPrev: null,
    /** @type {string[]} */
    attributes: null,
    /** @type {string[]} */
    components: null,
    /** @type {number} */
    index: 0,
    getSchema() {
        return this.schema[this.index];
    },
    getElement(name, schema) {
        var { element } = valOrDefault(schema, this.getSchema());

        if (isNullOrUndefined(element)) {
            throw new Error(`Projection error: schema has no elements`);
        }

        if (!hasOwn(element, name)) {
            throw new Error(`Projection error: element '${name}' not found`);
        }

        return element[name];
    },
    remove() {
        var parent = this.container.parentElement;

        removeChildren(this.container);
        if (isHTMLElement(this.container)) {
            let handler = LayoutHandler[this.concept.reftype];
            var renderContent = handler.call(this.concept.getConceptParent().projection, this.concept.refname);
            parent.replaceChild(renderContent, this.container);
            this.container = renderContent;
        }

        this.concept.unregister(this);

        return true;
    },
    /**
     * 
     * @param {string} message 
     * @param {*} value 
     */
    update(message, value) {
        if (!(/(attribute|component).(added|removed)/gi).test(message)) {
            return;
        }

        const [type, action] = message.split('.');

        if (type === "attribute" && !this.attributes.includes(value.name)) {
            console.warn("Attribute not found in projection");
            return;
        }
        if (type === "component" && !this.components.includes(value.name)) {
            console.warn("Component not found in projection", this.components);
            return;
        }

        const target = type === "attribute" ? value.target : value;

        var temp = getElement(`[data-id=${value.name}]`, this.container);

        if (!isHTMLElement(temp)) {
            this.editor.notify("This attribute cannot be rendered");
        }

        switch (action) {
            case "added":
                var projection = Projection.create(target.schema.projection, target, this.editor);

                temp.replaceWith(projection.render());
                temp.remove();
                break;
            case "removed":

                break;
            default:
                break;
        }
    },
    delete() {

    },
    render(_schema) {
        const schema = valOrDefault(_schema, this.getSchema());

        const { action, behaviour, constraint, element, layout, view } = schema;

        if (isHTMLElement(this.containers[this.index])) {
            this.container = this.containers[this.index];
            show(this.container);
            appendChildren(this.container, [this.btnNext, this.btnPrev]);

            return this.container;
        }

        var container = null;

        if (view) {
            container = fieldHandler.call(this, schema);
        } else {
            const { type, disposition } = layout;

            container = LayoutHandler[type].call(this, layout);

            if (this.schema.length > 1) {
                if (!isHTMLElement(this.btnPrev)) {
                    this.btnPrev = createButton({
                        type: "button",
                        class: ["btn", "btn-projection", "btn-projection--previous"],
                        disabled: this.index <= 0,
                        dataset: {
                            context: "projection",
                            action: "previous"
                        }
                    }, "Previous Projection");
                }

                if (!isHTMLElement(this.btnNext)) {
                    this.btnNext = createButton({
                        type: "button",
                        class: ["btn", "btn-projection", "btn-projection--next"],
                        disabled: this.index >= this.schema.length - 1,
                        dataset: {
                            context: "projection",
                            action: "next"
                        }
                    }, "Next Projection");
                }

                container.addEventListener('click', (event) => {
                    var target = event.target;
                    var previousContainer = this.container;
                    var container = null;

                    hide(previousContainer);
                    if (target === this.btnPrev) {
                        this.index -= 1;
                        container = this.render();
                        insertBeforeElement(previousContainer, container);

                    } else if (target === this.btnNext) {
                        this.index += 1;
                        container = this.render();
                        insertAfterElement(previousContainer, container);
                    }
                    show(this.container);

                    this.btnPrev.disabled = this.index <= 0;
                    this.btnNext.disabled = this.index >= this.schema.length - 1;
                });

                appendChildren(container, [this.btnNext, this.btnPrev]);
            }

            if (this.concept) {
                const { id, object, name } = this.concept;
                if (!["string", "set", "number", "reference"].includes(name)) {
                    Object.assign(container.dataset, {
                        object: object,
                        id: id,
                        name: name,
                    });
                }
            }
        }

        if (!isNode(container)) {
            throw new Error("Projection element container could not be created");
        }

        this.containers.push(container);
        this.container = container;

        if (this.concept) {
            this.concept.register(this);
        }

        return this.container;
    }
};

function stackHandler(layout) {
    const { disposition, orientation } = layout;

    var container = createDiv({
        class: ["projection-wrapper", `projection-wrapper--${orientation}`],
        dataset: {
            nature: "layout"
        }
    });

    for (let i = 0; i < disposition.length; i++) {
        const content = disposition[i];
        container.appendChild(dispositionHandler.call(this, content));
    }

    return container;
}

function wrapHandler(layout) {
    const { disposition } = layout;

    var container = createDiv({
        class: `projection-wrapper`,
        dataset: {
            nature: "layout"
        }
    });

    for (let i = 0; i < disposition.length; i++) {
        const content = disposition[i];
        container.appendChild(dispositionHandler.call(this, content));
    }


    return container;
}

function textHandler(layout) {
    const { disposition } = layout;

    var fragment = createDocFragment();

    if (Array.isArray(disposition)) {
        for (let i = 0; i < disposition.length; i++) {
            const content = disposition[i];
            fragment.appendChild(dispositionHandler.call(this, content));
        }
    } else {
        fragment.appendChild(dispositionHandler.call(this, disposition));
    }


    return fragment;
}

const tableLayoutHandler = {
    'cross': crossTableHandler,
    'column': columnTableHandler,
    'row': rowTableHandler,
};

function tableHandler(layout) {
    const { disposition, orientation, row, column } = layout;

    var table = createTable({
        dataset: {
            nature: "layout"
        }
    });
    table.appendChild(tableLayoutHandler[orientation].call(this, disposition));

    return table;
}

function crossTableHandler(layout, row, col) {
    var fragment = createDocFragment();

    const cellHandler = {
        "colspan": (cell, value) => cell.colSpan = value,
        "rowspan": (cell, value) => cell.rowSpan = value,
        "layout": (cell, value) => cell.appendChild(dispositionHandler.call(this, value)),
    };

    for (let i = 0; i < layout.length; i++) {
        let cols = layout[i];

        /** @type {HTMLTableRowElement} */
        let tableRow = createTableRow();
        for (let j = 0; j < cols.length; j++) {
            /** @type {HTMLTableCellElement} */
            let tableCell = createTableCell({ class: "table-cell" });

            let content = layout[i][j];
            if (isObject(content)) {
                for (const prop in content) {
                    const value = content[prop];
                    if (hasOwn(cellHandler, prop)) {
                        cellHandler[prop](tableCell, value);
                    }
                }
            } else if (isString(content)) {
                tableCell.appendChild(dispositionHandler.call(this, content));
            }
            tableRow.appendChild(tableCell);
        }
        fragment.appendChild(tableRow);
    }

    return fragment;
}

function columnTableHandler(layout) {
    var fragment = createDocFragment();

    const cellHandler = {
        "span": (cell, value) => cell.colSpan = value,
        "layout": (cell, value) => cell.appendChild(dispositionHandler.call(this, value)),
    };

    for (let i = 0; i < layout.length; i++) {
        let cols = layout[i];

        /** @type {HTMLTableRowElement} */
        let tableRow = createTableRow();
        for (let j = 0; j < cols.length; j++) {
            /** @type {HTMLTableCellElement} */
            let tableCell = createTableCell({ class: "table-cell" });

            let content = layout[i][j];
            if (isObject(content)) {
                for (const prop in content) {
                    const value = content[prop];
                    if (hasOwn(cellHandler, prop)) {
                        cellHandler[prop](tableCell, value);
                    }
                }
            } else if (isString(content)) {
                tableCell.appendChild(dispositionHandler.call(this, content));
            }
            tableRow.appendChild(tableCell);
        }
        fragment.appendChild(tableRow);
    }

    return fragment;
}

function rowHandler(value) {
    let cols = value[0];

    let tableRow = createTableRow();
    // for (let j = 0; j < cols.length; j++) {
    //     /** @type {HTMLTableCellElement} */
    //     let tableCell = createTableCell({ class: "table-cell" });

    //     let content = layout[i][j];
    //     if (isObject(content)) {
    //         for (const prop in content) {
    //             const value = content[prop];
    //             if (hasOwn(cellHandler, prop)) {
    //                 cellHandler[prop](tableCell, value);
    //             }
    //         }
    //     } else if (isString(content)) {
    //         tableCell.appendChild(dispositionHandler(content));
    //     }
    //     tableRow.appendChild(tableCell);
    // }
}

function rowTableHandler(layout) {
    var fragment = createDocFragment();

    const cellHandler = {
        "span": (cell, value) => cell.rowSpan = value,
        "layout": (cell, value) => cell.appendChild(dispositionHandler(value)),
    };

    for (let i = 0; i < layout.length; i++) {
        let cols = layout[i];

        /** @type {HTMLTableRowElement} */
        let tableRow = createTableRow();
        for (let j = 0; j < cols.length; j++) {
            /** @type {HTMLTableCellElement} */
            let tableCell = createTableCell({ class: "table-cell" });

            let content = layout[i][j];
            if (isObject(content)) {
                for (const prop in content) {
                    const value = content[prop];
                    if (hasOwn(cellHandler, prop)) {
                        cellHandler[prop](tableCell, value);
                    }
                }
            } else if (isString(content)) {
                tableCell.appendChild(dispositionHandler(content));
            }
            tableRow.appendChild(tableCell);
        }
        fragment.appendChild(tableRow);
    }

    return fragment;
}

function fieldHandler(schema) {
    var field = FieldFactory.createField(schema, this.concept, this.editor).init();
    field.projection = this;

    this.editor.registerField(field);

    return field.render();
}

function dispositionHandler(value) {
    var fragment = createDocFragment();

    if (hasOwn(LayoutHandler, value.type)) {
        return LayoutHandler[value.type].call(this, value);
    }

    var parts = parseDisposition(value);

    var textBuffer = "";

    const addText = () => {
        if (!isNullOrWhitespace(textBuffer)) {
            var tag = createSpan({ class: ["field", "field--label"], }, textBuffer.trim());
            fragment.appendChild(tag);
            textBuffer = "";
        }
    };

    const addContent = (content) => {
        if (isNode(content)) {
            fragment.appendChild(content);
        }
    };

    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        let handler = SymbolResolver[part.charAt(0)];
        if (handler) {
            addText();
            addContent(handler.call(this, part.substring(1)));
        } else {
            textBuffer += " " + parts[i];
        }
    }

    addText();

    return fragment;
}


function parseDisposition(value) {
    var parts = value.replace(/\s+/g, " ")
        .replace(/(#\w+(:\w+)?)/g, " $1 ")
        .replace(/(\$\w+(:\w+)?)/g, " $1 ")
        .split(" ")
        .filter(function (x) { return !isNullOrWhitespace(x); });

    return parts;
}

const StructureHandler = {
    'attribute': attributeHandler,
    'component': componentHandler
};

/**
 * 
 * @param {string} key 
 * @this {TextualProjection}
 */
function resolveStructure(key) {
    var [name, type = "attribute"] = key.split(":");

    return StructureHandler[type].call(this, name);
}

/**
 * Resolve and render attribute projection
 * @param {string} name 
 */
function attributeHandler(name) {
    if (!this.concept.hasAttribute(name)) {
        throw new Error(`PROJECTION: Attribute ${name} does not exist`);
    }

    this.attributes.push(name);

    if (!(this.concept.isAttributeRequired(name) || this.concept.isAttributeCreated(name))) {
        return createI({ class: "attribute--optional", dataset: { object: "attribute", id: name } });
    }

    var { target } = this.concept.getAttributeByName(name);
    var projection = Projection.create(target.schema.projection, target, this.editor);
    projection.parent = this;

    return projection.render();
}

/**
 * Resolve and render component projection
 * @param {string} name 
 */
function componentHandler(name) {
    if (!this.concept.hasComponent(name)) {
        throw new Error(`PROJECTION: Component ${name} does not exist`);
    }

    this.components.push(name);

    if (!(this.concept.isComponentCreated(name) || this.concept.isComponentRequired(name))) {
        return createI({ class: "component--optional", dataset: { object: "component", id: name } });
    }

    var component = this.concept.getComponentByName(name);
    var projection = Projection.create(component.schema.projection, component, this.editor);
    projection.parent = this;

    return projection.render();
}

/**
 * Resolves a reference in the schema
 * @param {string} key 
 * @this {Projection}
 */
function resolveReference(key) {
    var [name, from] = key.split(":");

    var element = this.getElement(name);

    const { action, behaviour, constraint, layout, view } = element;
    if (view) {
        return fieldHandler.call(this, element);
    } else if (layout) {
        const { type, disposition } = layout;
        return LayoutHandler[type].call(this, layout);
    }
    return LayoutHandler['text'].call(this, element);
}

function resolveScope() {

}