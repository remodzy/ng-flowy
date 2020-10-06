import { ArrowElement } from './ArrowElement';
import { Block } from './Block';


export class BlockElement extends Block{
    id: number;
    node: HTMLElement;
    window: Window;

    static find = (id, { window }) => {
        const { document } = window;
        const node = document.querySelector(`.blockid[value='${id}']`);

        return node ? new BlockElement(id, node.parentNode, { window }) : null;
    }

    static fromElement = (node, { window }) => {
        const input = node.querySelector(`.blockid`);
        return input ? new BlockElement(parseInt(input.value, 10), node, { window }) : null;
    }

    constructor(id, node, { window }) {
        super();
        this.id = parseInt(id, 10);
        this.node = node;
        this.window = window;
    }

    position = () => {
        const { top, left } = this.node.getBoundingClientRect();
        const { height, width } = this.window.getComputedStyle(this.node);

        return {
            top: top + this.window.scrollY,
            left: left + this.window.scrollX,
            height: parseInt(height, 10),
            width: parseInt(width, 10)
        };
    }

    styles = styles => {
        return Object.assign(this.node.style, styles);
    }

    arrow = () => {
        return ArrowElement.find(this);
    }
}
