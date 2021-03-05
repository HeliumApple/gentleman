import { createSpan, valOrDefault, createButton, createDocFragment, createTextArea, createInput, isString } from "zenkai";
import { StyleHandler } from './style-handler.js';
import { AttributeHandler } from './structure-handler.js';
import { LayoutFactory } from "./layout/index.js";
import { FieldFactory } from "./field/index.js";
import { StaticFactory } from "./static/index.js";
import { _ } from "core-js";


/**
 * Resolves the value
 * @returns {string}
 */
function resolveValue(object) {
    if (object.type === "property") {
        return this.projection.concept.getProperty(object.name);
    }

    return object;
}


export function ContentHandler(schema, concept, args = {}) {
    const contentConcept = valOrDefault(concept, this.projection.concept);

    if (schema.type === "layout") {
        let layout = LayoutFactory.createLayout(this.model, schema.layout, this.projection);
        layout.parent = this;
        layout.init(args);

        this.model.registerLayout(layout);

        return layout.render();
    } else if (schema.type === "field") {
        let field = FieldFactory.createField(this.model, schema, this.projection);
        field.model = this.model;
        field.parent = this;
        field.init(args);

        return field.render();
    } else if (schema.type === "static") {
        let staticContent = StaticFactory.createStatic(this.model, schema.static, this.projection);
        staticContent.parent = this;
        staticContent.init(args);

        this.model.registerStatic(staticContent);

        return staticContent.render();
    } if (schema.type === "input") {
        const { placeholder = "", type, style } = valOrDefault(schema.input, {});

        let input = null;

        if (this.readonly || this.resizable) {
            input = createSpan({
                editable: !this.readonly,
                title: placeholder,
                dataset: {
                    placeholder: resolveValue.call(this, placeholder),
                    nature: "field-component",
                    view: this.type,
                    id: this.id,
                }
            });
        } else if (this.multiline) {
            input = createTextArea({
                placeholder: placeholder,
                title: placeholder,
                dataset: {
                    nature: "field-component",
                    view: this.type,
                    id: this.id,
                }
            });
        } else {
            input = createInput({
                type: valOrDefault(type, "text"),
                placeholder: placeholder,
                title: placeholder,
                dataset: {
                    nature: "field-component",
                    view: this.type,
                    id: this.id,
                }
            });
        }

        if (this.disabled) {
            input.disabled = true;
        }

        if (this.focusable) {
            input.tabIndex = 0;
        } else {
            input.dataset.ignore = "all";
        }

        StyleHandler(input, style);

        return input;

    } else if (schema.type === "attribute") {
        return AttributeHandler.call(this, schema, contentConcept);
    } else if (schema.type === "template") {
        let template = this.model.getModelTemplate(schema.name);

        if (template.param) {
            // TODO: Merge and validate template.param and schema.param
            this.projection.addParam(schema.param);
        }

        const fragment = createDocFragment();
        template.content.forEach(element => {
            fragment.append(ContentHandler.call(this, element, concept, args));
        });

        return fragment;
    } else if (schema.type === "projection") {
        const index = this.projection.schema.findIndex((x) => x.tags.includes(schema.tag));

        let _schema = {
            "type": "static",
            "static": {
                "type": "button",
                "content": schema.content,
                "action": {
                    "name": "changeView",
                    "arg": [index]
                },
                "style": schema.style
            }
        };

        return ContentHandler.call(this, _schema, concept, args);
    } else if (schema.type === "property") {
        const { name } = schema;

        return this.projection.concept.getProperty(name);
    }

    console.error(schema);

    throw new TypeError("Bad argument: The type is not recognized");
}