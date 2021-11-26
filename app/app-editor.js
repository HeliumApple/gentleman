import {
    createButton, createUnorderedList, createListItem, createI, getElement,
    hasOwn, findAncestor, isHTMLElement, isNullOrUndefined, isFunction
} from "zenkai";
import { duplicateTab } from "@utils";
import { buildProjectionHandler } from "@generator/build-projection.js";
import { buildConceptHandler } from "@generator/build-concept.js";
//import { Gentleman } from "@dist/gentleman.core";

//const annotation = "annotation-model";
const LFol = ["mindmap-model"];//,"trafficlight-model","mindmap-model"];

/*const ANNOTATION__CONCEPT = require(`@models/${annotation}/concept.json`);
const ANNOTION__PROJECTION = require(`@models/${annotation}/projection.json`);
const ANNOTATION_CONFIG = require(`@models/${annotation}/config.json`);*/

const CMODEL__EDITOR = require('@models/concept-model/config.json');
const CMODEL__CONCEPT = require('@models/concept-model/concept.json');
const CMODEL__PROJECTION = require('@models/concept-model/projection.json');

const SMODEL__CONCEPT = require('@models/style-model/concept.json');
const SMODEL__PROJECTION = require('@models/style-model/projection.json');

const PMODEL__EDITOR = require('@models/projection-model/config.json');
const PMODEL__CONCEPT = require('@models/projection-model/concept.json');
const PMODEL__PROJECTION = require('@models/projection-model/projection.json');

const PMODEL_PROJ_MIND = require(`@models/mindmap-model/projection.json`);
const CMODEL_CONC_MIND = require(`@models/mindmap-model/concept.json`);
const CMODEL_CONF_MIND = require(`@models/mindmap-model/config.json`);

const PMODEL__HANDLER = {
    "value.changed": function () {
        if (!this.__previewStarted) {
            return false;
        }

        actionHandler["preview-projection"](this);
    },
    "value.added": function () {
        if (!this.__previewStarted) {
            return false;
        }

        actionHandler["preview-projection"](this);
    },
    "value.removed": function () {
        if (!this.__previewStarted) {
            return false;
        }

        actionHandler["preview-projection"](this);
    },
    "open-style": function (args) {
        let concept = args[0];
        let projection = this.createProjection(concept, "style");

        let window = this.findWindow("side-instance");
        if (isNullOrUndefined(window)) {

            window = this.createWindow("side-instance");
            window.container.classList.add("model-projection-sideview");
        }
        if (window.instances.size > 0) {
            let instance = Array.from(window.instances)[0];
            instance.delete();
        }
        let instance = this.createInstance(concept, projection, {
            type: "projection",
            close: "DELETE-PROJECTION"
        });

        window.addInstance(instance);
    },
    "open-state": function (args) {
        let concept = args[0];
        let projection = this.createProjection(concept, "state");

        let window = this.findWindow("side-instance");
        if (isNullOrUndefined(window)) {
            window = this.createWindow("side-instance");
            window.container.classList.add("model-projection-sideview");
        }

        if (window.instances.size > 0) {
            let instance = Array.from(window.instances)[0];
            instance.delete();
        }

        let instance = this.createInstance(concept, projection, {
            type: "projection",
            close: "DELETE-PROJECTION"
        });

        window.addInstance(instance);
    },
};

var inc = 0;
const nextId = () => `GE${inc++}`;

export const App = {
    /** @type {HTMLElement} */
    menu: null,
    /** @type {HTMLElement} */
    editorSection: null,
    /** @type {HTMLElement} */
    btnNew: null,
    /** @type {HTMLElement} */
    tabList: null,
    /** @type {*[]} */
    editors: null,
    /** @type {Map} */
    tabs: null,
    /** @type {Editor} */
    activeEditor: null,
    /** @type {HTMLElement} */
    activeTab: null,

    /**
    * Initiliazes the App
    * @returns {App}
    */
    init() {
        this.editors = [];
        this.tabs = new Map();
        this.bindDOM();
        this.bindEvents();
        this.render();

        return this;
    },
    refresh() {
        if (this.tabs.size === 0) {
            this.createEditor();
        }

        return this;
    },
    render() {
        this.refresh();
    },
    createEditor(options) {
        let editor = Gentleman.createEditor().init(options);
        editor.AnnotationProjectionLoaded=0;
        editor. modelAdded=0;
        editor.projAdded=0;
        editor.id = nextId();
        this.editors.push(editor);
        this.editorSection.append(editor.container);

        let tab = createTab(editor.id);
        this.tabList.append(tab);
        this.tabs.set(tab, editor);

        this.changeTab(tab);

        this.refresh();
        let btnBuild2 = createMenuButton.call(this, "add annotation", "enable annotation",editor);
        let BtnDEBUG = createMenuButton.call(this, "showConfig", "DEBUG: SHOW CONFIG", editor);
        let BtnDEBUG2 = createMenuButton.call(this, "showConcept","DEBUG: SHOW CONCEPTS",editor);
        editor.header.menu.append(btnBuild2,BtnDEBUG,BtnDEBUG2);
        /*editor.header.menu.append(btnBuild2,btnBuild3);
        let sousEditeur = this.createSubEditor({
            conceptModel: ANNOTATION__CONCEPT,
            projectionModel: ANNOTION__PROJECTION,
            config: ANNOTATION_CONFIG,
        });
        editor.subEditor=sousEditeur;*/
        return editor;
    },
    createSubEditor(options){
        let subEditor = Gentleman.createEditor().init(options);
        subEditor.is_annotation=1;
        subEditor.id = `AE${inc}`;
        this.editors.push(subEditor);
        this.editorSection.append(subEditor.container);

        let tab = createTab(subEditor.id);
        this.tabList.append(tab);
        this.tabs.set(tab, subEditor);

        this.changeTab(tab);

        this.refresh();
        return subEditor;
    },

    changeTab(tab) {
        if (isNullOrUndefined(tab)) {
            return;
        }

        if (this.activeTab) {
            if (this.activeTab === tab) {
                return this;
            }

            this.activeTab.classList.remove("active");
            this.tabs.get(this.activeTab).hide();
        }

        this.activeTab = tab;
        this.activeTab.classList.add("active");
        this.tabs.get(this.activeTab).show();

        this.refresh();
    },
    /**
     * Gets the list of `Editor`
     * @param {Function} pred Predicate
     * @returns {Editor[]} 
     */
    getEditors(pred) {
        const editors = this.editors;

        if (isFunction(pred)) {
            return this.editors.filter(env => pred(env));
        }

        return editors;
    },
    /**
     * Gets an `Editor` matching the id
     * @param {string} id
     * @returns {Editor}
     */
    getEditor(id) {
        return this.editors.find(editor => editor.id === id);
    },
    deleteEditor(id) {
        let index = this.editors.findIndex(p => p.id === id);

        if (index === -1) {
            return false;
        }

        let editor = this.getEditor(id);
        editor.destroy();

        this.editors.splice(index, 1);

        this.refresh();

        return true;
    },
    /**
     * Closes a tab
     * @param {HTMLElement} tab 
     * @returns {boolean}
     */
    closeTab(tab) {
        if (isNullOrUndefined(tab) || !this.tabs.has(tab)) {
            return false;
        }

        let editor = this.tabs.get(tab);
        this.deleteEditor(editor.id);
        this.tabs.delete(tab);

        if (tab === this.activeTab) {
            this.activeTab = null;
            if (this.tabList.hasChildNodes()) {
                this.changeTab(tab.previousSibling || tab.nextSibling);
            }
        }

        tab.remove();

        this.refresh();

        return true;
    },

    bindDOM() {
        this.menu = getElement(`[data-component="menu"]`);
        this.editorSection = getElement(`[data-component="editor"]`);
        this.tabSection = getElement(`[data-component="nav"]`);
        this.tabList = createUnorderedList({
            class: ["bare-list", "app-tabs"]
        });
        this.tabSection.append(this.tabList);

        return this;
    },
    bindEvents() {

        /**
         * Resolves the target in a container
         * @param {HTMLElement} element 
         * @returns 
         */
        function resolveTarget(element, container) {
            if (isNullOrUndefined(element) || element === container) {
                return null;
            }

            if (hasOwn(element.dataset, "action")) {
                return element;
            }
            if (element.parentElement === container) {
                return getElement(`[data-action]`, element);
            }

            return findAncestor(element, (el) => hasOwn(el.dataset, "action"), 5);
        }

        /**
         * Resolves a tab in a container
         * @param {HTMLElement} element 
         * @param {HTMLElement} container 
         * @returns 
         */
        function resolveTab(element, container) {
            if (element.parentElement === container) {
                return element;
            }

            return findAncestor(element, (el) => el.parentElement === container);
        }

        this.menu.addEventListener("click", (event) => {
            let target = resolveTarget(event.target, this.menu);

            if (!isHTMLElement(target)) {
                return false;
            }

            const { action } = target.dataset;

            if (action === "new") {
                this.createEditor();
                //console.log("hellO!");
            } else if (action === "new-metamodel") {
                //console.log("hi");
                let editor = this.createEditor({
                    /*conceptModel: CMODEL__CONCEPT,
                    projectionModel: CMODEL__PROJECTION,
                    config: CMODEL__EDITOR,*/
                    /*conceptModel: ANnotation__CONCEPT,
                    projectionModel: ANNOTION__PROJECTION,
                    config: ANNOTATION_CONFIG,*/
                    conceptModel: CMODEL_CONC_MIND,
                    projectionModel: PMODEL_PROJ_MIND,
                    config: CMODEL_CONF_MIND
                });

               // let BtnDEBUG = createMenuButton.call(this, "showConfig", "DEBUG: SHOW CONFIG", editor);
                let btnBuild = createMenuButton.call(this, "build-concept", "Build", editor);
                editor.header.menu.append(btnBuild);

            } else if (action === "new-projection") {
                let editor = this.createEditor({
                    conceptModel: PMODEL__CONCEPT,
                    projectionModel: PMODEL__PROJECTION,
                    config: PMODEL__EDITOR,
                    handlers: PMODEL__HANDLER,
                });

                editor.addConcept(SMODEL__CONCEPT);
                editor.addProjection(SMODEL__PROJECTION);

                let btnBuild = createMenuButton.call(this, "build-projection", "Build", editor);
                let btnPreview = createMenuButton.call(this, "preview-projection", "Preview", editor);
                //let BtnDEBUG = createMenuButton.call(this, "showConfig", "DEBUG: SHOW CONFIG", editor);

                editor.header.menu.append(btnBuild, btnPreview);
            }
        });

        this.tabList.addEventListener("click", (event) => {
            let tab = resolveTab(event.target, this.tabList);

            if (!isHTMLElement(tab)) {
                return false;
            }

            let target = resolveTarget(event.target, tab);

            if (isHTMLElement(target)) {
                const { action } = target.dataset;

                if (action === "close") {
                    this.closeTab(tab);
                }
            } else {
                this.changeTab(tab);
            }
        });
    }
};

/**
 * Create a tab item
 * @param {string} name 
 * @returns {HTMLElement}
 */
function createTab(name) {
    let icoDelete = createI({
        class: ["ico", "ico-delete"]
    }, "✖");

    let btnDelete = createButton({
        class: ["btn", "btn-close"],
        dataset: {
            action: "close"
        }
    }, icoDelete);
    if(name[0]=="G"){
    let container = createListItem({
        class: ["app-tab"],
    }, [name, btnDelete]);
    return container;
    }
    else{
        let container = createListItem({
            class: ["app-tab"],
        }, [name]);
        return container;
    }
}

const actionHandler = {
    "build-concept": function (editor) {
        buildConceptHandler.call(editor);
    },
    "build-projection": function (editor) {
        buildProjectionHandler.call(editor);
    },
    "preview-projection": function (editor) {
        const RESOURCE_NAME = "metamodel";

        if (!editor.hasResource(RESOURCE_NAME)) {
            editor.notify("<strong>Metamodel not found</strong>.", "error", 3000);
            editor.triggerEvent({ name: "load-resource", args: [RESOURCE_NAME] });

            return false;
        }

        let pmodel = buildProjectionHandler.call(editor, { download: false, notify: "error" });

        if (!pmodel) {
            return;
        }

        let cmodel = editor.getModel(RESOURCE_NAME);

        const channelID = `gentleman.editor@${editor.id}`;
        const channel = new BroadcastChannel(channelID);

        if (!editor.__previewStarted) {
            localStorage.setItem("gentleman.preview", channelID);
            duplicateTab();

            editor.__previewStarted = true;

            setTimeout(() => {
                channel.postMessage({
                    concept: cmodel,
                    projection: pmodel
                });
            }, 100);
        }

        channel.postMessage({
            concept: cmodel,
            projection: pmodel
        });
    },
    "showConfig": function(editor){
        console.log("======config======");
        console.log(editor.config);
        console.log("===end config====\n");
    },
    "showConcept": function(editor){
        console.log("======concepts=========");
        editor.conceptModel.getConcepts().forEach(concept => {
            console.log(concept);
        })
        console.log("======end concepts=========\n");
    },
    "add annotation": function(editor) {
        editor.enableAnnotation();
        editor.AnnotationProjectionLoaded=1;
    },  
    "add annotation old":function(editor) {
        if(editor.subEditor==null){
        let sousEditeur = this.createSubEditor({
            conceptModel: ANNOTATION__CONCEPT,
            projectionModel: ANNOTION__PROJECTION,
            config: ANNOTATION_CONFIG,
        });
        editor.subEditor=sousEditeur;

        //editor.subEditor.addProjection(PMODEL_PROJ_MIND);
        //editor.subEditor.addConcept(CMODEL_CONC_MIND);

        editor.conceptModel.getConcepts().forEach(concept => {
            //question: why RootConcepts doesn't save name
            editor.subEditor.conceptModel.addConcept(concept);
        });
        }
        else{
            console.log("projection");
            console.log(editor.subEditor.projectionModel);
            console.log("concept");
            console.log(editor.subEditor.conceptModel);
        }
    },
    "load annotation":function(editor){}
    
};




function createMenuButton(action, content, editor) {
    let button = createButton({
        class: ["btn", "app-editor-header__button"],
        dataset: {
            action: action
        }
    }, content);

    let hander = actionHandler[action];

    button.addEventListener("click", () => {
        hander.call(this, editor);
    });

    return button;
}