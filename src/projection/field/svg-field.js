import {
    createDocFragment, createSpan, createDiv, createTextArea, createInput,
    createUnorderedList, createListItem, findAncestor, removeChildren,
    isHTMLElement, isNullOrWhitespace, isEmpty, valOrDefault, hasOwn, isNullOrUndefined, isNull,
} from "zenkai";
import {
    hide, show, getCaretIndex, isHidden, NotificationType, getClosestSVG,
    getTopElement, getBottomElement, getRightElement, getLeftElement
} from "@utils/index.js";
import { StyleHandler } from "./../style-handler.js";
import { StateHandler } from "./../state-handler.js";
import { ContentHandler, resolveValue } from "./../content-handler.js";
import { Field } from "./field.js";
import { createNotificationMessage } from "./notification.js";

const BaseSVGField = {
    
    /** @type {string} */
    content : "",


    init(){

        return this;

    },

    render(){
        const fragment = createDocFragment();


        const { content, attributes = [], link} = this.schema;

        var parser = new DOMParser();

        if(!isHTMLElement(this.element)){
            this.element = createDiv({
                id: this.id,
                class: [],
                dataset:{
                    nature: "field",
                    view: "svg",
                    id: this.id
                }
            })
        }

        this.element.setAttribute("tabIndex", 0);
        this.focusable = true;

        if(!isHTMLElement(this.content)){
            this.content = parser.parseFromString(content.replace(/\&nbsp;/g, ''), "image/svg+xml").documentElement;
            fragment.appendChild(this.content);
        }


        if(isNullOrUndefined(this.link) && (!isNullOrUndefined(link))){
            this.link = this.projection.schema.findIndex((x) => x.tags.includes(link.tag));
            let target = this.content.querySelector("[data-" + link.marker + "]");

            link.type = "svg-link";

            target.addEventListener('click', (event) =>{
                this.projection.changeView(this.link);
            })
        }


        if((!isNullOrUndefined(link)) && isNullOrUndefined(this.informations)){
            let altis = this.projection.getInformations(this.link);
            this.projection.element = this;
            this.informations = altis.informations;
            console.log("Information");
            console.log(this.informations.get("name"));

        }

        if(isNullOrUndefined(this.deciders) && !isEmpty(attributes)){
            this.deciders = this.attributeHandler(attributes);
            this.update();
        }

        if(fragment.hasChildNodes()){
            this.element.appendChild(fragment);
        }

        return this.element;
    },
    attributeHandler(attributes){
        let deciders = [];


        attributes.forEach(element => {
            switch(element.placement.type){
                case "in-place":
                    let parent = this.content.querySelector("[data-" + element.placement.marker + "]");
                    

                    element.type = "svg-attribute";

                    let render = ContentHandler.call(this, element, null, this.args);
        
                    deciders.push(render);


                    parent.appendChild(render.content);

                    break;
                case "link-place":

                    let {type, sd = [], dd = []} = element.placement;


                    if(isNullOrUndefined(this.linkAttr)){
                        this.linkAttr = []; 
                    }

                    let current = {};

                    current.name = element.value;


                    current.field = this.informations.get(element.value);

                    console.log("field creation");
                    console.log(current.field.value);

                    current.value = current.field.value;
                    
                    /*dd/sd Management*/


                    if(!isEmpty(sd)){
                        current.sd = new Map();
                        sd.forEach(temp => {
                            temp.type = "template";
                            const stat = {};
                            var render = ContentHandler.call(this, temp, null, this.args);
                            stat.render = render;
                            stat.parent = this.content.querySelector("[data-" + temp.marker + "]")
                            current.sd.set(render.mv, stat);
                        });

                    }

                    if(isNullOrUndefined(this.dd) && (!(isEmpty(dd) || isNullOrUndefined(dd)))){
                        current.dd = [];
                        dd.forEach(temp => {
                            temp.type = "template";
                            var render = ContentHandler.call(this, temp, null, this.args);
                            current.dd.push(render);
                            var attach = this.content.querySelector("[data-" + temp.marker + "]");
                            if(isNullOrUndefined(attach)){
                                if(this.content.getAttribute("data-" +  temp.marker) === "before"){
                                    this.content.prepend(render.content)
                                }else{
                                    this.content.appendChild(render.content);
                                }
                            }else{
                                if(attach.getAttribute("data-" +  temp.marker) === "before"){
                                    attach.prepend(render.content)
                                }else{
                                    attach.appendChild(render.content);
                                }
                            }
                        });

                    }

                    /*Check for default value*/

                    this.linkAttr.push(current);


                    break;
            }

        });
        

        return deciders;
    },

    update(){
        if(!isNullOrUndefined(this.linkAttr)){
            this.linkAttr.forEach(attr => {
                this.clearStatics(attr.sd, attr.value);
                this.clearDynamics(attr.dd, attr.value);
                attr.value = attr.field.value;
                this.updateDynamics(attr.dd, attr.value);
                this.updateStatics(attr.sd, attr.value);
            })
        }
        if((!isNullOrUndefined(this.deciders)) && (!isEmpty(this.deciders))){
            this.deciders.forEach(inter => {
                inter.update(inter.field.value);
            })
        }
    },

    clearDynamics(dd, value){
        if(!isNullOrUndefined(dd)){
            dd.forEach(dyna =>{
                dyna.clear(value);
            })
        }
    },

    updateDynamics(dd, value){
        if(!isNullOrUndefined(dd)){
            dd.forEach(dyna =>{
                dyna.update(value);
            })
        }
    },

    clearStatics(sd, value){
        if(!isNullOrUndefined(sd)){
            let target = sd.get(value);
        
            if(!isNullOrUndefined(target)){
                target.parent.removeChild(target.render.content)
            }
        }
    },

    updateStatics(sd, value){
        if(!isNullOrUndefined(sd)){
            let target = sd.get(value);
        
            if(!isNullOrUndefined(target)){
                target.parent.appendChild(target.render.content)
            }
        }
    },

    focus(){
        console.log(this.linkAttr);
        this.element.focus();
        this.focused = true;
        this.deciders.forEach(d => {
            d.focusOut();
        })
        return this;
    },

    focusIn(){
        this.focus();
        return this;
    },

    focusOut(){
        this.focused = false;
        return this;
    },

    arrowHandler(dir, target){
        if(target === this.element){
            if(isNullOrUndefined(this.parent)){
                return false;
            }
            
            return this.parent.arrowHandler(dir, this.element);
        }

        let closestElement = getClosestSVG(target.foreign, dir, this, false);

        if(!isNullOrUndefined(closestElement)){
            target.focusOut();
            closestElement.focus();
            return true
        }

        return false;

    },

    enterHandler(target){
        this.index = 0;
        this.deciders[0].focusIn();

    },

    escapeHandler(target){

        if(target !== this.element){
            return this.focus();
        }
        let parent = findAncestor(target, (el) => el.tabIndex === 0);
        let element = this.environment.resolveElement(parent);

        if (element) {
            element.focus(parent);
        }

        return false;
    },

    setIndex(active){
        let newIndex = 0;
        this.deciders.forEach(d => {
            if (d.id === active.id){
                this.index = newIndex;
                return;
            }
            newIndex++;
        })
    }
}





export const SVGField = Object.assign(
    Object.create(Field),
    BaseSVGField
);