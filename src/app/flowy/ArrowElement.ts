import { BlockElement } from './BlockElement';

export class ArrowElement {
    node: HTMLElement;
    blockElement: BlockElement;
    window: Window;
    document: Window;

    static find(blockElement: BlockElement) {
        const { document } = blockElement.window;
        const node = document.querySelector(`.arrowid[value='${blockElement.id}']`);
        return node ? new ArrowElement(blockElement, node.parentNode as HTMLElement) : null;
    }

    constructor(blockElement: any, node: HTMLElement) {
        this.blockElement = blockElement;
        this.node = node;
        this.window = blockElement.window;
        this.document = blockElement.document;
    }

    html = html => {
        if (html !== undefined) {
            this.node.innerHTML = html;
        }
        return this.node.innerHTML;
    }

    position = () => {
        const { top, left } = this.node.getBoundingClientRect();

        return {
            top: top + this.window.scrollY,
            left: left + this.window.scrollX
        };
    }

    styles = styles => {
        return Object.assign(this.node.style, styles);
    }

    remove = () => {
        this.node.remove();
    }
}
