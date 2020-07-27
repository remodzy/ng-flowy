export class Block {
    parent: number;
    childWidth: number;
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(
        parent?: number,
        childWidth?: number,
        id?: number,
        x?: number,
        y?: number,
        width?: number,
        height?: number)
    {
        this.parent = parent;
        this.childWidth = childWidth;
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    maxWidth = () => Math.max(this.childWidth, this.width);
}
